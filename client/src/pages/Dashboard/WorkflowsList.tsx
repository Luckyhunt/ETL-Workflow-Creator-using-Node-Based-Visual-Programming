import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaFolderOpen, FaClock, FaTrash, FaPlus, FaShareAlt } from 'react-icons/fa';
import ShareModal from "../../components/ShareModal/ShareModal";
import { useConfirm } from "../../contexts/ConfirmContext";
import { workflowApi } from '../../services/workflowApi';
import type { WorkflowData } from '../../services/workflowApi';

const SkeletonCard = () => (
    <div style={{
        background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border-grey)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', opacity: 0.6
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="skeleton-pulse" style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-pulse" style={{ width: '150px', height: '18px', borderRadius: '4px', background: '#f1f5f9' }}></div>
                <div className="skeleton-pulse" style={{ width: '100px', height: '12px', borderRadius: '4px', background: '#f1f5f9' }}></div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-pulse" style={{ width: '100px', height: '36px', borderRadius: '6px', background: '#f1f5f9' }}></div>
            <div className="skeleton-pulse" style={{ width: '40px', height: '36px', borderRadius: '6px', background: '#f1f5f9' }}></div>
        </div>
    </div>
);

const WorkflowsList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ownedWorkflows, setOwnedWorkflows] = useState<Partial<WorkflowData>[]>([]);
    const [sharedWorkflows, setSharedWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');
    const [shareTarget, setShareTarget] = useState<any>(null);

    const { confirm } = useConfirm();

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const [owned, shared] = await Promise.all([
                workflowApi.getUserWorkflowsMetadata(),
                workflowApi.getSharedWorkflowsMetadata()
            ]);
            setOwnedWorkflows(owned);
            setSharedWorkflows(shared);
        } catch (error) {
            console.error("Failed to load workflows:", error);
            toast.error("Failed to load workflows. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id?: string) => {
        e.stopPropagation();
        
        if (!id) return;

        const isConfirmed = await confirm({
            title: "Delete Workflow",
            message: "Are you sure you want to delete this workflow? This action cannot be undone.",
            confirmText: "Delete",
            isDestructive: true
        });

        if (isConfirmed) {
            try {
                await workflowApi.deleteWorkflow(id);
                setOwnedWorkflows(ownedWorkflows.filter(w => w.id !== id));
                toast.success("Workflow deleted successfully!");
            } catch (error) {
                console.error("Failed to delete workflow:", error);
                toast.error("Failed to delete workflow. Please try again.");
            }
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div 
            style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <style>
                {`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
                .skeleton-pulse {
                    animation: pulse 1.5s infinite ease-in-out;
                }
                `}
            </style>
            <motion.div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-grey)', paddingBottom: '20px' }}
                variants={itemVariants}
            >
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-text-dark)' }}>My Workflows</h1>
                <motion.button 
                    onClick={() => navigate('/playground')}
                    whileHover={{ scale: 1.02, background: 'transparent', color: 'var(--color-text-dark)' }}
                    whileTap={{ scale: 0.98 }}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', 
                        background: 'var(--color-text-dark)', 
                        color: 'var(--color-bg-1)', border: '1px solid var(--color-text-dark)', borderRadius: '4px', cursor: 'pointer', 
                        fontWeight: '600', transition: 'all 0.2s' 
                    }}
                >
                    <FaPlus /> New Workflow
                </motion.button>
            </motion.div>

            {/* TABS */}
            <motion.div 
                style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--color-border-grey)', marginBottom: '10px' }}
                variants={itemVariants}
            >
                <div 
                    onClick={() => setActiveTab('owned')}
                    style={{ 
                        padding: '12px 0', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        color: activeTab === 'owned' ? 'var(--color-accent-1)' : 'var(--color-text-grey)',
                        borderBottom: '3px solid',
                        borderColor: activeTab === 'owned' ? 'var(--color-accent-1)' : 'transparent',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    My Workflows ({ownedWorkflows.length})
                </div>
                <div 
                    onClick={() => setActiveTab('shared')}
                    style={{ 
                        padding: '12px 0', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        color: activeTab === 'shared' ? 'var(--color-accent-1)' : 'var(--color-text-grey)',
                        borderBottom: '3px solid',
                        borderColor: activeTab === 'shared' ? 'var(--color-accent-1)' : 'transparent',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    Shared With Me ({sharedWorkflows.length})
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column' }}
                    >
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </motion.div>
                ) : activeTab === 'owned' ? (
                    // OWNED WORKFLOWS LIST
                    ownedWorkflows.length > 0 ? (
                        <motion.div 
                            key="owned-list"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={containerVariants}
                            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                            className="recent-workflows-list"
                        >
                            {ownedWorkflows.map(wf => (
                                <motion.div 
                                    key={wf.id} 
                                    className="workflow-listItem" 
                                    onClick={() => navigate(`/playground?id=${wf.id}`)}
                                    variants={itemVariants}
                                >
                                <div className="workflow-item-content">
                                    <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)', fontSize: '1.5rem', flexShrink: 0 }}>
                                        <FaFolderOpen />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wf.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-grey)' }}>
                                            <FaClock /> Last updated: {wf.updated_at ? new Date(wf.updated_at).toLocaleString() : 'Never'}
                                        </div>
                                    </div>
                                </div>
                                <div className="workflow-item-actions">
                                    <button>
                                        Open Editor
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(e, wf.id)}
                                        style={{ border: '1px solid #ff4d4f', background: 'transparent', color: '#ff4d4f' }}
                                            title="Delete Workflow"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="owned-empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-grey)', borderRadius: '4px' }}
                        >
                            <div style={{ fontSize: '3rem', color: 'var(--color-text-grey)', opacity: 0.5, marginBottom: '16px' }}><FaFolderOpen /></div>
                            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '8px' }}>No workflows found</h3>
                            <p style={{ color: 'var(--color-text-grey)', marginBottom: '24px' }}>It looks like you haven't saved any workflows yet.</p>
                            <button 
                                onClick={() => navigate('/playground')}
                                style={{ padding: '10px 24px', background: 'var(--color-text-dark)', color: 'var(--color-bg-1)', border: '1px solid var(--color-text-dark)', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}
                            >
                                Create your first workflow
                            </button>
                        </motion.div>
                    )
                ) : (
                    // SHARED WORKFLOWS LIST
                    sharedWorkflows.length > 0 ? (
                        <motion.div 
                            key="shared-list"
                            initial="hidden" animate="visible" exit="hidden"
                            variants={containerVariants}
                            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                        >
                            {sharedWorkflows.map(wf => (
                                <motion.div 
                                    key={wf.id} 
                                    className="workflow-listItem" 
                                    onClick={() => navigate(`/playground?id=${wf.id}`)}
                                    variants={itemVariants}
                                >
                                <div className="workflow-item-content">
                                    <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)', fontSize: '1.5rem', flexShrink: 0 }}>
                                        <FaShareAlt />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {wf.name}
                                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg-3)', color: 'var(--color-text-grey)', border: '1px solid var(--color-border-grey)', marginLeft: '12px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                                                {wf.role}
                                            </span>
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-grey)' }}>
                                            <FaClock /> Last updated: {wf.updated_at ? new Date(wf.updated_at).toLocaleString() : 'Never'}
                                        </div>
                                    </div>
                                </div>
                                <div className="workflow-item-actions">
                                    <button>
                                        Open Shared Editor
                                    </button>
                                </div>
                            </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="shared-empty"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-grey)', borderRadius: '4px' }}
                        >
                            <div style={{ fontSize: '3rem', color: 'var(--color-border-grey)', opacity: 0.5, marginBottom: '16px' }}><FaShareAlt /></div>
                            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '8px' }}>Nothing shared yet</h3>
                            <p style={{ color: 'var(--color-text-grey)', marginBottom: '24px' }}>Workflows that others share with your email will appear here.</p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default WorkflowsList;
