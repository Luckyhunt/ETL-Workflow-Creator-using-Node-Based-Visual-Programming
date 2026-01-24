import React, { useState } from 'react';
import { WorkflowContext } from './WorkflowContextObject';
import type { Workflow, WorkflowNode, WorkflowEdge, Position } from '../types';


export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workflow, setWorkflow] = useState<Workflow>({
        _id: '',
        name: '',
        activeSourceNode: null,
        selectedNode: null,
        definition: {
            nodes: [],
            edges: []
        },
    });

    const addNode = (node: WorkflowNode) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: { ...prev.definition, nodes: [...prev.definition.nodes, node] },
        }));
    };

    const removeNode = (nodeId: string) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: {
                nodes: prev.definition.nodes.filter((node) => node._id !== nodeId),
                edges: prev.definition.edges.filter(
                    (edge) => edge.source._id !== nodeId && edge.target._id !== nodeId
                ),
            },
        }));
    };

    const addEdge = (edge: WorkflowEdge) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: { ...prev.definition, edges: [...prev.definition.edges, edge] },
        }));
    };

    const removeEdge = (edgeId: string) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: {
                ...prev.definition,
                edges: prev.definition.edges.filter((edge) => edge._id !== edgeId),
            },
        }));
    };

    const updateNode = (nodeId: string, data: Partial<WorkflowNode['data']>) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: {
                ...prev.definition,
                nodes: prev.definition.nodes.map((node) =>
                    node._id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
                ),
            },
        }));
    };

    const updateNodePosition = (nodeId: string, position: Position) => {
        setWorkflow((prev) => ({
            ...prev,
            definition: {
                ...prev.definition,
                nodes: prev.definition.nodes.map((node) => {
                    if (node._id === nodeId) {
                        return { ...node, position }
                    }
                    return node
                })
            }
        }))
    }

    const setActiveSourceNode = (node: WorkflowNode | null) => {
        if (!node) {
            setWorkflow((prev) => ({
                ...prev,
                activeSourceNode: null
            }))
            return
        }

        const findNode = workflow.definition.nodes.find(n => node._id === n._id)

        if (findNode) {
            setWorkflow((prev) => ({
                ...prev,
                activeSourceNode: findNode
            }))
        }
    }

    const setSelectedNode = (node: WorkflowNode | null) => {
        if (node !== null) {
            setWorkflow((prev) => ({
                ...prev,
                selectedNode: node
            }))
        }
    }

    return (
        <WorkflowContext.Provider value={{
            workflow,
            addNode,
            removeNode,
            addEdge,
            removeEdge,
            updateNode,
            updateNodePosition,
            setActiveSourceNode,
            setSelectedNode
        }}>
            {children}
        </WorkflowContext.Provider>
    );
};