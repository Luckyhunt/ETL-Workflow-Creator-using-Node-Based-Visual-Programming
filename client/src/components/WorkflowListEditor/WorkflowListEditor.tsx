import React, { useState } from 'react';
import { useWorkflow } from '../../contexts/useWorkflow';
import { MdDeleteOutline, MdArrowDownward } from 'react-icons/md';
import { LuFileInput } from 'react-icons/lu';
import { IoSettingsOutline } from 'react-icons/io5';
import { HiLightningBolt } from 'react-icons/hi';
import InputNode from '../../editorComponents/InputNode/InputNode';
import TransformNode from '../../editorComponents/TransformNode/TransformNode';
import OutputNode from '../../editorComponents/OutputNode/OutputNode';
import './WorkflowListEditor.css';
import { v4 as uuidv4 } from "uuid";
import { TransformType } from '../../types';

export const WorkflowListEditor: React.FC = () => {
    const { workflow, removeNode, addNode, addEdge } = useWorkflow();
    const [expandedNode, setExpandedNode] = useState<string | null>(null);

    // Naive linear sort for the list view based on connected edges
    // In a real DAG, we'd need a topological sort, but for a simple mobile view,
    // we just try to order them Input -> Transform -> Output heuristically.
    const sortedNodes = [...workflow.definition.nodes].sort((a, b) => {
        const typeWeight = { 'input': 1, 'transform': 2, 'output': 3 };
        return typeWeight[a.type as keyof typeof typeWeight] - typeWeight[b.type as keyof typeof typeWeight];
    });

    const createNewInputNode = () => {
        addNode({
            _id: uuidv4(), type: "input", position: { x: 0, y: 0 },
            data: { file: { filename: "", fileContent: "", fileFormat: 'NA' } }
        });
    };

    const createNewTransformNode = () => {
        const id = uuidv4();
        addNode({
            _id: id, type: "transform", position: { x: 0, y: 0 },
            data: { transformType: TransformType.FILTER, columnName: '', condition: '' }
        });
        
        // Auto-connect to previous node in list if exists
        const prevNode = sortedNodes[sortedNodes.length - 1];
        if (prevNode) {
            addEdge({ _id: uuidv4(), source: prevNode, target: { _id: id } as any });
        }
    };

    const createNewOutputNode = () => {
        const id = uuidv4();
        addNode({
            _id: id, type: 'output', position: { x: 0, y: 0 },
            name: `Output ${sortedNodes.length + 1}`,
            data: { file: { filename: `out_${uuidv4().substring(0,4)}.json`, fileContent: '', fileFormat: 'NA' } }
        });

        // Auto-connect to previous node
        const prevNode = sortedNodes[sortedNodes.length - 1];
        if (prevNode) {
            addEdge({ _id: uuidv4(), source: prevNode, target: { _id: id } as any });
        }
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'input': return <LuFileInput />;
            case 'transform': return <IoSettingsOutline />;
            case 'output': return <HiLightningBolt />;
            default: return null;
        }
    };

    return (
        <div className="list-editor-container">
            <div className="list-editor-header">
                <h2>Workflow Editor (List View)</h2>
                <p>Nodes are executed top to bottom.</p>
            </div>

            <div className="list-editor-nodes">
                {sortedNodes.length === 0 ? (
                    <div className="list-editor-empty">
                        <LuFileInput size={48} className="empty-icon"/>
                        <p>No nodes yet. Add an Input node to start.</p>
                    </div>
                ) : (
                    sortedNodes.map((node, index) => (
                        <React.Fragment key={node._id}>
                            <div className={`list-editor-node ${expandedNode === node._id ? 'expanded' : ''} ${node.type}`}>
                                <div 
                                    className="list-editor-node-header" 
                                    onClick={() => setExpandedNode(expandedNode === node._id ? null : node._id)}
                                >
                                    <div className="node-icon">{getIcon(node.type)}</div>
                                    <div className="node-title">{node.name || node.type}</div>
                                    <button 
                                        className="node-delete-btn"
                                        onClick={(e) => { e.stopPropagation(); removeNode(node._id); }}
                                    >
                                        <MdDeleteOutline />
                                    </button>
                                </div>
                                
                                {expandedNode === node._id && (
                                    <div className="list-editor-node-body">
                                        {node.type === 'input' && <InputNode node={node as any} />}
                                        {node.type === 'transform' && <TransformNode node={node as any} />}
                                        {node.type === 'output' && <OutputNode node={node as any} />}
                                    </div>
                                )}
                            </div>
                            
                            {/* Down arrow connector between nodes */}
                            {index < sortedNodes.length - 1 && (
                                <div className="list-editor-connector">
                                    <MdArrowDownward />
                                </div>
                            )}
                        </React.Fragment>
                    ))
                )}
            </div>

            <div className="list-editor-actions">
                <button onClick={createNewInputNode} className="add-node-btn input">
                    <LuFileInput /> Add Input
                </button>
                <button onClick={createNewTransformNode} className="add-node-btn transform">
                    <IoSettingsOutline /> Add Transform
                </button>
                <button onClick={createNewOutputNode} className="add-node-btn output">
                    <HiLightningBolt /> Add Output
                </button>
            </div>
        </div>
    );
};
