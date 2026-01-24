import { useContext } from 'react';
import { WorkflowContext } from './WorkflowContextObject';
import type { WorkflowContextType } from './WorkflowContextObject';

export const useWorkflow = (): WorkflowContextType => {
    const context = useContext(WorkflowContext);
    if (!context) {
        throw new Error('useWorkflow must be used within a WorkflowProvider');
    }
    return context;
};