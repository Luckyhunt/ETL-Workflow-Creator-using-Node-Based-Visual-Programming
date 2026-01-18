import React, { createContext, useContext, useState } from 'react';
import type { Workflow, WorkflowNode, WorkflowEdge, Position } from '../types';

type WorkflowContextType = {
    workflow: Workflow;
    addNode: (node: WorkflowNode) => void;
    removeNode: (nodeId: string) => void;
    addEdge: (edge: WorkflowEdge) => void;
    removeEdge: (edgeId: string) => void;
    updateNode: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
    updateNodePosition: (nodeId: string, position: Position) => void;
    setActiveSourceNode: (node: WorkflowNode | null) => void;
};

const defaultInputNode: WorkflowNode = {
    _id: 'input-node',
    type: 'input',
    position: { x: 950, y: 220 },
    data: {
        file: {
            filename: "",
            fileContent: "",
            fileFormat: "csv",
        }
    },
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [workflow, setWorkflow] = useState<Workflow>({
        _id: '',
        name: '',
        activeSourceNode: null,
        definition: {
            nodes: [defaultInputNode],
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

    return (
        <WorkflowContext.Provider value={{
            workflow,
            addNode,
            removeNode,
            addEdge,
            removeEdge,
            updateNode,
            updateNodePosition,
            setActiveSourceNode
        }}>
            {children}
        </WorkflowContext.Provider>
    );
};

export const useWorkflow = (): WorkflowContextType => {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within a WorkflowProvider');
    }
    return context;
};