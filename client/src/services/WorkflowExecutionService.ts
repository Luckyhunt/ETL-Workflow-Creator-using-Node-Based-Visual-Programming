import type { Workflow } from "../types";
import { WorkflowEngine } from "../engine/WorkflowEngine";
import type { ExecutionResult } from "../engine/WorkflowEngine";

class WorkflowExecutionService {
  private engine: WorkflowEngine;

  constructor() {
    this.engine = new WorkflowEngine();
  }

  /**
   * Execute a workflow and return the result
   */
  async executeWorkflow(workflow: Workflow): Promise<ExecutionResult> {
    return await this.engine.executeWorkflow(workflow);
  }

  /**
   * Validate a workflow without executing it
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; error?: string } {
    return this.engine.validateWorkflow(workflow);
  }

  /**
   * Get the execution order of nodes in the workflow
   */
  getExecutionOrder(workflow: Workflow): { success: boolean; order?: string[]; error?: string } {
    return this.engine.determineExecutionOrder(workflow);
  }
}

// Export a singleton instance
export const workflowExecutionService = new WorkflowExecutionService();

// Export the class as well for testing purposes
export { WorkflowExecutionService };