import { createContext } from 'react';
import type { Workflow, WorkflowNode, WorkflowEdge, Position } from '../types';

export type WorkflowContextType = {
    workflow: Workflow;
    addNode: (node: WorkflowNode) => void;
    removeNode: (nodeId: string) => void;
    addEdge: (edge: WorkflowEdge) => void;
    removeEdge: (edgeId: string) => void;
    updateNode: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
    updateNodePosition: (nodeId: string, position: Position) => void;
    setActiveSourceNode: (node: WorkflowNode | null) => void;
    setSelectedNode: (node: WorkflowNode | null) => void;
    deleteDraft: () => void;
    shareWorkflow: () => Promise<string>;
};

export const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);