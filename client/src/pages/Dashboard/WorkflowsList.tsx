import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaFolderOpen, FaClock, FaTrash, FaPlus, FaShareAlt } from 'react-icons/fa';
import { workflowApi } from '../../services/workflowApi';
import type { WorkflowData } from '../../services/workflowApi';

const WorkflowsList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ownedWorkflows, setOwnedWorkflows] = useState<WorkflowData[]>([]);
    const [sharedWorkflows, setSharedWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const [owned, shared] = await Promise.all([
                workflowApi.getUserWorkflows(),
                workflowApi.getSharedWorkflows()
            ]);
            setOwnedWorkflows(owned);
            setSharedWorkflows(shared);
        } catch (error) {
            console.error("Failed to load workflows:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this workflow?")) {
            try {
                await workflowApi.deleteWorkflow(id);
                setOwnedWorkflows(ownedWorkflows.filter(w => w.id !== id));
            } catch (error) {
                console.error("Failed to delete workflow:", error);
                alert("Failed to delete workflow");
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
            <motion.div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-grey)', paddingBottom: '20px' }}
                variants={itemVariants}
            >
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-text-dark)' }}>My Workflows</h1>
                <motion.button 
                    onClick={() => navigate('/playground')}
                    whileHover={{ scale: 1.05, background: 'var(--color-accent-2)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', 
                        background: 'linear-gradient(135deg, var(--color-accent-1), var(--color-accent-2))', 
                        color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', 
                        fontWeight: '600', boxShadow: 'var(--shadow-md)', transition: 'box-shadow 0.2s' 
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
                        style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-grey)' }}
                    >
                        Loading workflows...
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
                        >
                            {ownedWorkflows.map(wf => (
                                <motion.div 
                                    key={wf.id} 
                                    onClick={() => navigate(`/playground?id=${wf.id}`)}
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.01, boxShadow: 'var(--shadow-md)' }}
                                    style={{
                                        background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border-grey)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--color-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-1)', fontSize: '1.5rem' }}>
                                            <FaFolderOpen />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-dark)' }}>{wf.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-grey)' }}>
                                                <FaClock /> Last updated: {new Date(wf.updated_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button style={{ padding: '8px 16px', border: '1px solid var(--color-accent-1)', background: 'transparent', color: 'var(--color-accent-1)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            Open Editor
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, wf.id)}
                                            style={{ padding: '8px 12px', border: '1px solid #ff4d4f', background: 'transparent', color: '#ff4d4f', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
                            style={{ textAlign: 'center', padding: '60px 20px', background: 'white', border: '1px dashed var(--color-border-grey)', borderRadius: '16px' }}
                        >
                            <div style={{ fontSize: '3rem', color: 'var(--color-text-grey)', opacity: 0.5, marginBottom: '16px' }}><FaFolderOpen /></div>
                            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '8px' }}>No workflows found</h3>
                            <p style={{ color: 'var(--color-text-grey)', marginBottom: '24px' }}>It looks like you haven't saved any workflows yet.</p>
                            <button 
                                onClick={() => navigate('/playground')}
                                style={{ padding: '12px 24px', background: 'var(--color-accent-1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
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
                                    onClick={() => navigate(`/playground?id=${wf.id}`)}
                                    variants={itemVariants}
                                    whileHover={{ scale: 1.01, boxShadow: 'var(--shadow-md)' }}
                                    style={{
                                        background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border-grey)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', fontSize: '1.5rem' }}>
                                            <FaShareAlt />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-dark)' }}>
                                                {wf.name}
                                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: wf.role === 'editor' ? '#dcfce7' : '#e0e7ff', color: wf.role === 'editor' ? '#16a34a' : '#4f46e5', marginLeft: '12px', fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                                                    {wf.role}
                                                </span>
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--color-text-grey)' }}>
                                                <FaClock /> Last updated: {new Date(wf.updated_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button style={{ padding: '8px 16px', border: '1px solid #d97706', background: 'transparent', color: '#d97706', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
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
                            style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px' }}
                        >
                            <div style={{ fontSize: '3rem', color: '#94a3b8', opacity: 0.5, marginBottom: '16px' }}><FaShareAlt /></div>
                            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '8px' }}>Nothing shared yet</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Workflows that others share with your email will appear here.</p>
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default WorkflowsList;
