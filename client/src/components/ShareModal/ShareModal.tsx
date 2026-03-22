import React, { useState, useEffect } from 'react';
import { workflowApi } from '../../services/workflowApi';
import { FaTimes, FaLink, FaUserPlus, FaTrash } from 'react-icons/fa';
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
            setFeedback({ message: 'Shared successfully ✅', type: 'success' });
        } catch (error: any) {
            const msg = error.message || '';
            if (msg.includes('unique') || msg.includes('Already shared')) {
                setFeedback({ message: 'Already shared ⚠️', type: 'warning' });
            } else if (msg.includes('not found')) {
                setFeedback({ message: 'User not found ❌', type: 'error' });
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
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', padding: '30px',
                width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                position: 'relative'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', color: '#111827' }}>
                        <FaUserPlus color="var(--color-accent-1)" /> Share Workflow
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#9ca3af', display: 'flex', padding: '5px' }}>
                        <FaTimes />
                    </button>
                </div>

                {feedback && (
                    <div style={{ 
                        padding: '10px 15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        backgroundColor: feedback.type === 'success' ? '#ecfdf5' : feedback.type === 'warning' ? '#fffbeb' : '#fef2f2',
                        color: feedback.type === 'success' ? '#065f46' : feedback.type === 'warning' ? '#92400e' : '#991b1b',
                        border: `1px solid ${feedback.type === 'success' ? '#34d399' : feedback.type === 'warning' ? '#fbbf24' : '#f87171'}`
                    }}>
                        {feedback.message}
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
                            style={{ flex: 1, padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.95rem', outline: 'none' }}
                        />
                        <select 
                            value={role} 
                            onChange={(e) => setRole(e.target.value as any)}
                            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '10px', background: 'white', cursor: 'pointer', outline: 'none' }}
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
                            background: 'var(--color-accent-1)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {isLoading ? 'Sharing...' : 'Invite User'}
                    </button>
                </form>

                <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#374151', fontWeight: '600' }}>Collaborators</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', marginBottom: '25px', paddingRight: '5px' }}>
                    {shares.length === 0 ? (
                        <div style={{ color: '#9ca3af', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>Only you have access.</div>
                    ) : (
                        shares.map((share) => (
                            <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>{share.shared_with_email}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>{share.role}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveShare(share.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', display: 'flex', borderRadius: '50%' }}
                                    title="Remove Access"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ paddingTop: '20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        onClick={copyLink}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 20px', 
                            background: 'white', 
                            color: 'var(--color-accent-1)', 
                            border: '1px solid var(--color-accent-1)', 
                            borderRadius: '10px', 
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
