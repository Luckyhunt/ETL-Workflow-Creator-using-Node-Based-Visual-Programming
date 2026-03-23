import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaFolderOpen, FaClock, FaShareAlt } from 'react-icons/fa';
import './Dashboard.css';
import { workflowApi } from '../../services/workflowApi';
import type { WorkflowData } from '../../services/workflowApi';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [ownedWorkflows, setOwnedWorkflows] = useState<WorkflowData[]>([]);
    const [sharedWorkflows, setSharedWorkflows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                // Fetch both owned and shared in parallel
                const [owned, shared] = await Promise.all([
                    workflowApi.getUserWorkflows(),
                    workflowApi.getSharedWorkflows()
                ]);
                setOwnedWorkflows(owned.slice(0, 3)); // Only show top 3 recent on Home
                setSharedWorkflows(shared.slice(0, 3));
            } catch (error) {
                console.error("Failed to load workflows:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkflows();
    }, []);

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
            className="dashboard-home"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.div className="welcome-banner" variants={itemVariants}>
                <h1>Welcome back, <span style={{ color: "var(--color-text-dark)" }}>{user?.email?.split('@')[0]}</span></h1>
                <p>Ready to orchestrate some data today?</p>
            </motion.div>

            <motion.div className="dashboard-actions" variants={itemVariants}>
                <motion.div 
                    className="action-card create-action" 
                    onClick={() => navigate('/playground')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="action-icon">
                        <FaPlus />
                    </div>
                    <div>
                        <h3>Create New Workflow</h3>
                        <p>Start a new ETL pipeline from scratch with the visual editor.</p>
                    </div>
                </motion.div>

                <motion.div 
                    className="action-card browse-action" 
                    onClick={() => navigate('/dashboard/workflows')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="action-icon">
                        <FaFolderOpen />
                    </div>
                    <div>
                        <h3>Browse Workflows</h3>
                        <p>View, edit, or share your existing saved workflows.</p>
                    </div>
                </motion.div>
            </motion.div>

            <div className="recent-workflows-section">
                <div className="section-header">
                    <h2>Recent Owned Workflows</h2>
                    <button className="view-all-btn" onClick={() => navigate('/dashboard/workflows')}>View All</button>
                </div>
                
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-grey)' }}>Loading your workflows...</div>
                ) : ownedWorkflows.length > 0 ? (
                    <div className="recent-workflows-list">
                        {ownedWorkflows.map((wf, idx) => (
                            <motion.div 
                                key={wf.id} 
                                className="workflow-listItem" 
                                onClick={() => navigate(`/playground?id=${wf.id}`)}
                                variants={itemVariants}
                            >
                                <div className="workflow-item-content">
                                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)', flexShrink: 0 }}>
                                        <FaFolderOpen />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wf.name} <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg-3)', color: 'var(--color-text-grey)', border: '1px solid var(--color-border-grey)', marginLeft: '6px', fontWeight: 'normal' }}>Owned</span></h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-grey)' }}>
                                            <FaClock /> {new Date(wf.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="workflow-item-actions">
                                    <button>Open</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon"><FaFolderOpen /></div>
                        <h3>No owned workflows yet</h3>
                        <p>Create your first workflow to get started.</p>
                        <button className="empty-create-btn" onClick={() => navigate('/playground')}>
                            Create Workflow
                        </button>
                    </div>
                )}
            </div>

            {/* SHARED WITH ME SECTION */}
            <div className="recent-workflows-section" style={{ marginTop: '2rem' }}>
                <div className="section-header">
                    <h2>Shared With Me</h2>
                </div>
                
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-grey)' }}>Loading shared workflows...</div>
                ) : sharedWorkflows.length > 0 ? (
                    <div className="recent-workflows-list">
                        {sharedWorkflows.map(wf => (
                            <motion.div 
                                key={wf.id} 
                                className="workflow-listItem" 
                                onClick={() => navigate(`/playground?id=${wf.id}`)}
                                variants={itemVariants}
                            >
                                <div className="workflow-item-content">
                                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-grey)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dark)', flexShrink: 0 }}>
                                        <FaShareAlt />
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {wf.name}
                                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg-3)', color: 'var(--color-text-grey)', border: '1px solid var(--color-border-grey)', marginLeft: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                {wf.role}
                                            </span>
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-grey)' }}>
                                            <FaClock /> {new Date(wf.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="workflow-item-actions">
                                    <button>Open</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state" style={{ minHeight: '150px' }}>
                        <p style={{ color: 'var(--color-text-grey)', fontSize: '0.9rem', margin: 0 }}>No workflows have been shared with you yet.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Dashboard;
