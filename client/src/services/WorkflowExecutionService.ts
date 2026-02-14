import type { Workflow } from "../types";

class WorkflowExecutionService {
  /**
   * Execute a workflow by sending it to the Python backend
   */
  async executeWorkflow(workflow: Workflow): Promise<any> {
    try {
      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update output nodes with preview data if available
      if (result.success && result.results) {
        for (const nodeId in result.results) {
          const nodeResult = result.results[nodeId];
          if (nodeResult.data) {
            // Update the node data with the processed result for preview
            // This would typically involve updating the workflow state
            // For now, we'll just return the result with preview data
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error executing workflow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Apply a single transformation (for real-time preview in transform nodes)
   */
  async applyTransformation(inputData: any[], transformType: string, params: any): Promise<any> {
    try {
      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/workflow/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: inputData,
          transform_type: transformType,
          params: params
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error applying transformation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate a graph from data
   */
  async generateGraph(data: any[], graphType: string, xCol: string, yCol?: string, title?: string): Promise<any> {
    try {
      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/graph/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          graph_type: graphType,
          x_col: xCol,
          y_col: yCol,
          title: title || 'Generated Chart'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error generating graph:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export a singleton instance
export const workflowExecutionService = new WorkflowExecutionService();

// Export the class as well for testing purposes
export { WorkflowExecutionService };