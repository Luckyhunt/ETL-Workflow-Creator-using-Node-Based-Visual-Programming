import type { Workflow } from "../types";

class WorkflowExecutionService {
  /**
   * Execute a workflow by sending it to the Python backend
   */
  async executeWorkflow(workflow: Workflow): Promise<any> {
    try {
      console.log("Sending Workflow to Backend:", JSON.stringify(workflow, null, 2));
      
      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/workflow/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });

      if (!response.ok) {
        // Safe error handling
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // STEP 2 & 3: Safe JSON Parsing
      const data = await response.json();
      console.log("Response type:", typeof data);
      console.log("Response:", data);

      const safeData = typeof data === "string" ? JSON.parse(data) : data;
      
      return safeData;
    } catch (error) {
      console.error('Execution error:', error);
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
      const payload = {
        input_data: inputData,
        transform_type: transformType,
        params: params
      };
      console.log("Sending Transformation:", payload);

      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/workflow/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response type:", typeof data);
      console.log("Response:", data);

      const safeData = typeof data === "string" ? JSON.parse(data) : data;
      return safeData;
    } catch (error) {
      console.error('Transformation error:', error);
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
      const payload = {
        data: data,
        graph_type: graphType,
        x_col: xCol,
        y_col: yCol,
        title: title || 'Generated Chart'
      };
      console.log("Sending Graph Request:", payload);

      const response = await fetch('https://etl-workflow-creator-using-node-based.onrender.com/api/graph/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const dataJson = await response.json();
      console.log("Response type:", typeof dataJson);
      console.log("Response:", dataJson);

      const safeData = typeof dataJson === "string" ? JSON.parse(dataJson) : dataJson;
      return safeData;
    } catch (error) {
      console.error('Graph error:', error);
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