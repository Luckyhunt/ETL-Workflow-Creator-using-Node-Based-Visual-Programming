import React, { useState, useEffect } from 'react';
import { workflowApi } from '../../services/workflowApi';
import { FaTimes, FaLink, FaUserPlus, FaTrash, FaCheckCircle, FaExclamationCircle, FaTimesCircle } from 'react-icons/fa';
import { useConfirm } from '../../contexts/ConfirmContext';

interface ShareModalProps {
    workflowId: string;
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ workflowId, onClose }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
    const [shares, setShares] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);
    const { confirm } = useConfirm();

    useEffect(() => {
        loadShares();
        
        // ESC key listener
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [workflowId]);

    const loadShares = async () => {
        try {
            const data = await workflowApi.getWorkflowShares(workflowId);
            setShares(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        setFeedback(null);
        try {
            await workflowApi.shareWorkflow(workflowId, email, role);
            setEmail('');
            await loadShares();
            setFeedback({ message: 'Shared successfully', type: 'success' });
        } catch (error: any) {
            const msg = error.message || '';
            if (msg.includes('unique') || msg.includes('Already shared')) {
                setFeedback({ message: 'Already shared', type: 'warning' });
            } else if (msg.includes('not found')) {
                setFeedback({ message: 'User not found', type: 'error' });
            } else {
                setFeedback({ message: 'Error sharing: ' + msg, type: 'error' });
            }
        } finally {
            setIsLoading(false);
            // Clear success feedback after 3 seconds
            setTimeout(() => setFeedback(prev => prev?.type === 'success' ? null : prev), 3000);
        }
    };

    const handleRemoveShare = async (shareId: string) => {
        const isConfirmed = await confirm({
            title: "Remove Access",
            message: "Are you sure you want to remove this user's access?",
            confirmText: "Remove",
            isDestructive: true
        });
        if (!isConfirmed) return;
        
        try {
            await workflowApi.removeShare(shareId);
            await loadShares();
            setFeedback({ message: 'Access removed', type: 'success' });
            setTimeout(() => setFeedback(null), 2000);
        } catch (error: any) {
            setFeedback({ message: 'Error removing share: ' + error.message, type: 'error' });
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/playground?id=${workflowId}`;
        navigator.clipboard.writeText(url);
        setFeedback({ message: 'Link copied to clipboard!', type: 'success' });
        setTimeout(() => setFeedback(null), 2000);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: 'var(--color-bg-1)', borderRadius: '4px', padding: '30px',
                width: '90%', maxWidth: '500px', border: '1px solid var(--color-border-grey)',
                position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', color: 'var(--color-text-dark)' }}>
                        <FaUserPlus color="var(--color-text-dark)" /> Share Workflow
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-grey)', display: 'flex', padding: '5px' }}>
                        <FaTimes />
                    </button>
                </div>

                {feedback && (
                    <div style={{ 
                        padding: '10px 15px', 
                        borderRadius: '4px', 
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : feedback.type === 'warning' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: feedback.type === 'success' ? 'var(--color-success-green)' : feedback.type === 'warning' ? '#facc15' : 'var(--color-delete-red)',
                        border: `1px solid ${feedback.type === 'success' ? 'var(--color-success-green)' : feedback.type === 'warning' ? '#facc15' : 'var(--color-delete-red)'}`
                    }}>
                        {feedback.type === 'success' && <FaCheckCircle style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                        {feedback.type === 'warning' && <FaExclamationCircle style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                        {feedback.type === 'error' && <FaTimesCircle style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                        <span style={{ verticalAlign: 'middle' }}>{feedback.message}</span>
                    </div>
                )}

                <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="email" 
                            placeholder="collaboration@email.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ flex: 1, padding: '12px 14px', border: '1px solid var(--color-border-grey)', borderRadius: '4px', background: 'var(--color-bg-2)', color: 'var(--color-text-dark)', fontSize: '0.95rem', outline: 'none' }}
                        />
                        <select 
                            value={role} 
                            onChange={(e) => setRole(e.target.value as any)}
                            style={{ padding: '10px', border: '1px solid var(--color-border-grey)', borderRadius: '4px', background: 'var(--color-bg-2)', color: 'var(--color-text-dark)', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                        </select>
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        style={{ 
                            padding: '12px', 
                            background: 'var(--color-text-dark)', 
                            color: 'var(--color-bg-1)', 
                            border: '1px solid var(--color-text-dark)', 
                            borderRadius: '4px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {isLoading ? 'Sharing...' : 'Invite User'}
                    </button>
                </form>

                <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: 'var(--color-text-dark)', fontWeight: '600' }}>Collaborators</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '25px', paddingRight: '5px' }}>
                    {shares.length === 0 ? (
                        <div style={{ color: 'var(--color-text-grey)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>Only you have access.</div>
                    ) : (
                        shares.map((share) => (
                            <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'var(--color-bg-2)', borderRadius: '4px', border: '1px solid var(--color-border-grey)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>{share.shared_with_email}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-grey)', textTransform: 'capitalize' }}>{share.role}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveShare(share.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--color-delete-red)', cursor: 'pointer', padding: '8px', display: 'flex', borderRadius: '50%' }}
                                    title="Remove Access"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ paddingTop: '20px', borderTop: '1px solid var(--color-border-grey)', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        onClick={copyLink}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 20px', 
                            background: 'transparent', 
                            color: 'var(--color-text-dark)', 
                            border: '1px solid var(--color-text-dark)', 
                            borderRadius: '4px', 
                            cursor: 'pointer', 
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FaLink /> Copy Workflow Link
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
