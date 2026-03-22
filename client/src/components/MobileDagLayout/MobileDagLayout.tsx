import React, { useState, useMemo } from 'react';
import { useWorkflow } from '../../contexts/useWorkflow';
import { LuFileInput } from 'react-icons/lu';
import { IoSettingsOutline } from 'react-icons/io5';
import { HiLightningBolt } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { TransformType } from '../../types';
import type { WorkflowNode } from '../../types';
import InputNode from '../../editorComponents/InputNode/InputNode';
import TransformNode from '../../editorComponents/TransformNode/TransformNode';
import OutputNode from '../../editorComponents/OutputNode/OutputNode';
import './MobileDagLayout.css';
import { MdClose } from 'react-icons/md';

const MobileNodeEditorSheet = ({ node, onClose }: { node: WorkflowNode, onClose: () => void }) => {
    const { workflow, addEdge, removeEdge, removeNode } = useWorkflow();
    const availableTargets = workflow.definition.nodes.filter(
        n => n._id !== node._id && n.type !== 'input'
    );
    const existingEdges = workflow.definition.edges.filter(e => e.source._id === node._id);
    const connectedTargetIds = existingEdges.map(e => typeof e.target === 'string' ? e.target : e.target._id);

    const handleMobileConnect = (targetId: string) => {
        if (!targetId) return;
        const targetNode = workflow.definition.nodes.find(n => n._id === targetId);
        if (!targetNode) return;
        addEdge({ _id: uuidv4(), source: node, target: targetNode });
    };

    return (
        <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="mobile-editor-sheet"
        >
            <div className="sheet-header">
                <h3>{node.name || node.type.toUpperCase() + ' NODE'}</h3>
                <button onClick={onClose} className="sheet-close-btn"><MdClose /></button>
            </div>
            <div className="sheet-content">
                {/* Editor Content */}
                <div className="sheet-inner-editor">
                    {node.type === 'input' && <InputNode node={node as any} />}
                    {node.type === 'transform' && <TransformNode node={node as any} />}
                    {node.type === 'output' && <OutputNode node={node as any} />}
                </div>

                {/* Mobile Connect Logic */}
                {node.type !== 'output' && (
                    <div className="sheet-quick-connect">
                        <div className="sheet-section-title">Quick Connect</div>
                        {existingEdges.length > 0 && (
                            <div className="sheet-connected-tags">
                                {existingEdges.map(edge => {
                                    const targetId = typeof edge.target === 'string' ? edge.target : edge.target._id;
                                    const targetNode = workflow.definition.nodes.find(n => n._id === targetId);
                                    return (
                                        <div key={edge._id} className="sheet-tag">
                                            <span>&rarr; {targetNode?.name || targetNode?.type || 'Unknown'}</span>
                                            <button onClick={() => removeEdge(edge._id)}>×</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <select className="sheet-select" value="" onChange={(e) => handleMobileConnect(e.target.value)}>
                            <option value="" disabled>Select target node...</option>
                            {availableTargets.map(target => {
                                const isConnected = connectedTargetIds.includes(target._id);
                                return (
                                    <option key={target._id} value={target._id} disabled={isConnected}>
                                        {target.name || target.type} {isConnected ? '(Connected)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
                
                {/* Delete Node */}
                 <div className="sheet-delete-section">
                     <button className="sheet-delete-node-btn" onClick={() => {
                         removeNode(node._id);
                         onClose();
                     }}>
                         Delete Node
                     </button>
                 </div>
            </div>
        </motion.div>
    );
};

export const MobileDagLayout = () => {
    const { workflow } = useWorkflow();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Topological sort & level calculation
    const layout = useMemo(() => {
        const nodes = workflow.definition.nodes;
        const edges = workflow.definition.edges;
        
        // Build adjacency list for incoming edges
        const incoming = new Map<string, string[]>();
        nodes.forEach(n => incoming.set(n._id, []));
        edges.forEach(e => {
            const targetId = typeof e.target === 'string' ? e.target : e.target._id;
            const sourceId = typeof e.source === 'string' ? e.source : e.source._id;
            const inc = incoming.get(targetId) || [];
            inc.push(sourceId);
            incoming.set(targetId, inc);
        });

        const levels = new Map<string, number>();
        
        let changed = true;
        let iterations = 0;
        
        nodes.forEach(n => {
            const incs = incoming.get(n._id) || [];
            if (incs.length === 0 || n.type === 'input') {
                levels.set(n._id, 0);
            } else {
                levels.set(n._id, -1);
            }
        });

        while (changed && iterations < 100) {
            changed = false;
            iterations++;
            nodes.forEach(n => {
                const incs = incoming.get(n._id) || [];
                if (incs.length > 0) {
                    let maxParentLevel = -1;
                    incs.forEach(pId => {
                        const pLevel = levels.get(pId);
                        if (pLevel !== undefined && pLevel > maxParentLevel) {
                            maxParentLevel = pLevel;
                        }
                    });
                    if (maxParentLevel !== -1 && levels.get(n._id) !== maxParentLevel + 1) {
                        levels.set(n._id, maxParentLevel + 1);
                        changed = true;
                    }
                }
            });
        }

        // Group by level
        const levelGroups: WorkflowNode[][] = [];
        nodes.forEach(n => {
            const lvl = levels.get(n._id) !== -1 ? levels.get(n._id) || 0 : 0; 
            if (!levelGroups[lvl]) levelGroups[lvl] = [];
            levelGroups[lvl].push(n);
        });

        return levelGroups.filter(l => l && l.length > 0);
    }, [workflow.definition.nodes, workflow.definition.edges]);

    const getIcon = (type: string) => {
        if (type === 'input') return <LuFileInput />;
        if (type === 'transform') return <IoSettingsOutline />;
        return <HiLightningBolt />;
    };

    const selectedNode = workflow.definition.nodes.find(n => n._id === selectedNodeId);

    return (
        <div className="mobile-dag-layout-wrap">
            <div className="mobile-dag-map">
                {layout.length === 0 && (
                    <div className="mobile-dag-empty">No nodes in workflow. Use sidebar to add nodes.</div>
                )}
                
                {layout.map((row, rowIndex) => (
                    <div key={rowIndex} className="mobile-dag-row-container">
                        <div className="mobile-dag-level-label">Stage {rowIndex + 1}</div>
                        <div className="mobile-dag-row">
                            {row.map(node => (
                                <div 
                                    key={node._id} 
                                    className={`mobile-dag-node-block ${node.type}`}
                                    onClick={() => setSelectedNodeId(node._id)}
                                >
                                    <div className="node-block-icon">{getIcon(node.type)}</div>
                                    <div className="node-block-name">{node.name || node.type}</div>
                                </div>
                            ))}
                        </div>
                        {rowIndex < layout.length - 1 && (
                            <div className="mobile-dag-flow-indicator">
                                ↓
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedNodeId && selectedNode && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mobile-sheet-overlay"
                            onClick={() => setSelectedNodeId(null)}
                        />
                        <MobileNodeEditorSheet 
                            node={selectedNode} 
                            onClose={() => setSelectedNodeId(null)} 
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileDagLayout;
