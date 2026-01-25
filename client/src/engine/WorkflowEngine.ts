import type { Workflow, WorkflowNode, WorkflowEdge, NodeType, IFile } from "../types";
import { TransformType } from "../types";

// Define data structure for passing between nodes
export interface NodeData {
  [key: string]: any;
}

// Define the result of executing a workflow
export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  nodeResults?: Record<string, any>;
}

// Define the execution context
export interface ExecutionContext {
  inputData: NodeData;
  currentNodeId: string;
  workflow: Workflow;
  nodeResults: Record<string, any>;
  visited: Set<string>;
}

/**
 * ETL Workflow Execution Engine
 * Implements the complete workflow execution lifecycle
 */
export class WorkflowEngine {
  
  /**
   * Execute a complete workflow from input to output
   */
  async executeWorkflow(workflow: Workflow): Promise<ExecutionResult> {
    try {
      // 1. Validate the workflow
      const validation = this.validateWorkflow(workflow);
      if (!validation.valid) {
        return {
          success: false,
          error: `Workflow validation failed: ${validation.error}`
        };
      }

      // 2. Determine execution order using topological sort
      const executionOrder = this.determineExecutionOrder(workflow);
      
      if (!executionOrder.success) {
        return {
          success: false,
          error: `Could not determine execution order: ${executionOrder.error}`
        };
      }

      // 3. Execute nodes in order
      const nodeResults: Record<string, any> = {};
      for (const nodeId of executionOrder.order!) {
        const node = workflow.definition.nodes.find(n => n._id === nodeId);
        if (!node) continue;

        const result = await this.executeNode(node, workflow, nodeResults);
        
        if (!result.success) {
          return {
            success: false,
            error: `Node execution failed for node ${nodeId}: ${result.error}`,
            nodeResults
          };
        }
        
        nodeResults[nodeId] = result.data;
      }

      // 4. Return the final result (from output nodes)
      const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
      const finalResult = outputNodes.reduce((acc, node) => {
        acc[node._id] = nodeResults[node._id];
        return acc;
      }, {} as Record<string, any>);

      return {
        success: true,
        data: finalResult,
        nodeResults
      };
    } catch (error) {
      return {
        success: false,
        error: `Execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Validate the workflow structure
   */
  validateWorkflow(workflow: Workflow): { valid: boolean; error?: string } {
    // Check if there's at least one input node
    const inputNodes = workflow.definition.nodes.filter(n => n.type === 'input');
    if (inputNodes.length === 0) {
      return { valid: false, error: "Workflow must have at least one input node" };
    }

    // Check if there's at least one output node
    const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
    if (outputNodes.length === 0) {
      return { valid: false, error: "Workflow must have at least one output node" };
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow)) {
      return { valid: false, error: "Workflow has circular dependencies" };
    }

    // Check if all nodes are connected in a valid way
    const disconnectedNodes = this.findDisconnectedNodes(workflow);
    if (disconnectedNodes.length > 0) {
      return { 
        valid: false, 
        error: `Workflow has disconnected nodes: ${disconnectedNodes.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Check for circular dependencies in the workflow
   */
  private hasCircularDependencies(workflow: Workflow): boolean {
    const nodes = workflow.definition.nodes;
    const edges = workflow.definition.edges;
    
    // Build adjacency list
    const adjList: Record<string, string[]> = {};
    for (const node of nodes) {
      adjList[node._id] = [];
    }
    
    for (const edge of edges) {
      adjList[edge.source._id].push(edge.target._id);
    }

    // Detect cycle using DFS
    const visiting = new Set<string>();
    const visited = new Set<string>();

    for (const node of nodes) {
      if (!visited.has(node._id)) {
        if (this.detectCycleDFS(node._id, adjList, visiting, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper for detecting cycles using DFS
   */
  private detectCycleDFS(
    nodeId: string, 
    adjList: Record<string, string[]>, 
    visiting: Set<string>, 
    visited: Set<string>
  ): boolean {
    if (visiting.has(nodeId)) {
      return true; // Cycle detected
    }
    
    if (visited.has(nodeId)) {
      return false; // Already processed
    }

    visiting.add(nodeId);
    
    for (const neighbor of adjList[nodeId]) {
      if (this.detectCycleDFS(neighbor, adjList, visiting, visited)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    
    return false;
  }

  /**
   * Find disconnected nodes in the workflow
   */
  private findDisconnectedNodes(workflow: Workflow): string[] {
    const nodes = workflow.definition.nodes;
    const edges = workflow.definition.edges;
    
    if (nodes.length === 0) return [];

    // Build a map of connected components using Union-Find approach
    const connectedToInput = new Set<string>();
    
    // Find all input nodes
    for (const node of nodes) {
      if (node.type === 'input') {
        connectedToInput.add(node._id);
      }
    }

    // Propagate connections forward through edges
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of edges) {
        if (connectedToInput.has(edge.source._id) && !connectedToInput.has(edge.target._id)) {
          connectedToInput.add(edge.target._id);
          changed = true;
        }
      }
    }

    // Find nodes not connected to any input
    const disconnected: string[] = [];
    for (const node of nodes) {
      if (!connectedToInput.has(node._id)) {
        disconnected.push(node._id);
      }
    }

    return disconnected;
  }

  /**
   * Determine execution order using topological sort
   */
  determineExecutionOrder(workflow: Workflow): { success: boolean; order?: string[]; error?: string } {
    const nodes = workflow.definition.nodes;
    const edges = workflow.definition.edges;
    
    // Build adjacency list and in-degree map
    const adjList: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    // Initialize
    for (const node of nodes) {
      adjList[node._id] = [];
      inDegree[node._id] = 0;
    }

    // Build graph
    for (const edge of edges) {
      adjList[edge.source._id].push(edge.target._id);
      inDegree[edge.target._id]++;
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const order: string[] = [];

    // Find nodes with zero in-degree
    for (const nodeId in inDegree) {
      if (inDegree[nodeId] === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      order.push(currentId);

      // Reduce in-degree of neighbors
      for (const neighborId of adjList[currentId]) {
        inDegree[neighborId]--;
        if (inDegree[neighborId] === 0) {
          queue.push(neighborId);
        }
      }
    }

    // Check if all nodes were included (cycle detection)
    if (order.length !== nodes.length) {
      return { 
        success: false, 
        error: "Cycle detected in workflow - cannot determine execution order" 
      };
    }

    return { success: true, order };
  }

  /**
   * Execute a single node based on its type
   */
  async executeNode(
    node: WorkflowNode, 
    workflow: Workflow, 
    nodeResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      switch (node.type) {
        case 'input':
          return await this.executeInputNode(node, workflow, nodeResults);
        case 'transform':
          return await this.executeTransformNode(node, workflow, nodeResults);
        case 'output':
          return await this.executeOutputNode(node, workflow, nodeResults);
        default:
          return { 
            success: false, 
            error: `Unknown node type: ${(node as any).type}` 
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Node execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute an input node
   */
  private async executeInputNode(
    node: WorkflowNode,
    workflow: Workflow,
    nodeResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const inputData = node.data as any;
      
      // Check if file content exists
      if (!inputData.file || !inputData.file.fileContent) {
        return { 
          success: false, 
          error: `Input node ${node._id} has no file content` 
        };
      }

      // Parse the file content based on format
      let parsedData;
      try {
        switch (inputData.file.fileFormat?.toLowerCase()) {
          case 'csv':
            parsedData = this.parseCSV(inputData.file.fileContent);
            break;
          case 'json':
            parsedData = JSON.parse(inputData.file.fileContent);
            break;
          case 'xml':
            parsedData = this.parseXML(inputData.file.fileContent);
            break;
          default:
            // Try to auto-detect based on content
            if (inputData.file.fileContent.trim().startsWith('{')) {
              parsedData = JSON.parse(inputData.file.fileContent);
            } else {
              parsedData = this.parseCSV(inputData.file.fileContent);
            }
        }
      } catch (parseError) {
        return { 
          success: false, 
          error: `Failed to parse input file: ${parseError instanceof Error ? parseError.message : String(parseError)}` 
        };
      }

      return { 
        success: true, 
        data: parsedData 
      };
    } catch (error) {
      return {
        success: false,
        error: `Input node execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute a transform node
   */
  private async executeTransformNode(
    node: WorkflowNode,
    workflow: Workflow,
    nodeResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const transformData = node.data as any;
      const transformType = transformData.transformType as TransformType;
      
      // Find the input data from connected source nodes
      const inputNodeIds = this.getInputNodeIds(node._id, workflow);
      if (inputNodeIds.length === 0) {
        return { 
          success: false, 
          error: `Transform node ${node._id} has no connected input data` 
        };
      }

      // Get the data from the first input (in a more complex system, we might merge multiple inputs)
      let inputData = nodeResults[inputNodeIds[0]];
      if (!inputData) {
        return { 
          success: false, 
          error: `No input data available for transform node ${node._id}` 
        };
      }

      // Apply the transformation
      let result;
      switch (transformType) {
        case TransformType.FILTER:
          result = this.applyFilterTransformation(inputData, transformData);
          break;
        case TransformType.DROP_COLUMN:
          result = this.applyDropColumnTransformation(inputData, transformData);
          break;
        case TransformType.RENAME_COLUMN:
          result = this.applyRenameColumnTransformation(inputData, transformData);
          break;
        case TransformType.NORMALIZE:
          result = this.applyNormalizeTransformation(inputData, transformData);
          break;
        case TransformType.FILL_NA:
          result = this.applyFillNATransformation(inputData, transformData);
          break;
        case TransformType.TRIM:
          result = this.applyTrimTransformation(inputData, transformData);
          break;
        case TransformType.TO_UPPER:
          result = this.applyToUpperTransformation(inputData, transformData);
          break;
        case TransformType.TO_LOWER:
          result = this.applyToLowerTransformation(inputData, transformData);
          break;
        default:
          return { 
            success: false, 
            error: `Unsupported transform type: ${transformType}` 
          };
      }

      return { 
        success: true, 
        data: result 
      };
    } catch (error) {
      return {
        success: false,
        error: `Transform node execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute an output node
   */
  private async executeOutputNode(
    node: WorkflowNode,
    workflow: Workflow,
    nodeResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const outputData = node.data as any;
      
      // Find the input data from connected source nodes
      const inputNodeIds = this.getInputNodeIds(node._id, workflow);
      if (inputNodeIds.length === 0) {
        return { 
          success: false, 
          error: `Output node ${node._id} has no connected input data` 
        };
      }

      // Get the data from the first input (in a more complex system, we might merge multiple inputs)
      let inputData = nodeResults[inputNodeIds[0]];
      if (!inputData) {
        return { 
          success: false, 
          error: `No input data available for output node ${node._id}` 
        };
      }

      // Convert the data to the specified output format
      let outputContent;
      try {
        switch (outputData.file?.fileFormat?.toLowerCase()) {
          case 'csv':
            outputContent = this.convertToCSV(inputData);
            break;
          case 'json':
            outputContent = JSON.stringify(inputData, null, 2);
            break;
          case 'xml':
            outputContent = this.convertToXML(inputData);
            break;
          default:
            // Default to JSON
            outputContent = JSON.stringify(inputData, null, 2);
        }
      } catch (convertError) {
        return { 
          success: false, 
          error: `Failed to convert data to output format: ${convertError instanceof Error ? convertError.message : String(convertError)}` 
        };
      }

      return { 
        success: true, 
        data: {
          fileName: outputData.file?.filename || `output_${node._id}.json`,
          fileFormat: outputData.file?.fileFormat || 'json',
          content: outputContent
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Output node execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get IDs of nodes that feed into the given node
   */
  private getInputNodeIds(targetNodeId: string, workflow: Workflow): string[] {
    return workflow.definition.edges
      .filter(edge => edge.target._id === targetNodeId)
      .map(edge => edge.source._id);
  }

  /**
   * Parse CSV content into an array of objects
   */
  private parseCSV(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j]?.trim() || '';
      }
      
      result.push(row);
    }

    return result;
  }

  /**
   * Parse XML content (simplified implementation)
   */
  private parseXML(xmlContent: string): any {
    // In a real implementation, we'd use a proper XML parser
    // For now, we'll return the raw content as a string property
    return { xmlContent };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and wrap in quotes if needed
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any): string {
    // In a real implementation, we'd use a proper XML builder
    // For now, we'll return a simplified representation
    return JSON.stringify(data, null, 2); // Placeholder
  }

  /**
   * Apply filter transformation
   */
  private applyFilterTransformation(data: any[], transformData: any): any[] {
    const { columnName, condition } = transformData;
    
    if (!columnName || !condition) {
      return data; // No filtering applied
    }

    // Simple condition evaluation - in a real system, this would be more robust
    try {
      // For now, implement a basic filter based on column value
      // This is a simplified implementation - a real one would support complex conditions
      return data.filter(row => {
        const value = row[columnName];
        if (value === undefined) return false;
        
        // Simple condition evaluation (e.g., "age > 20")
        if (condition.includes('>')) {
          const parts = condition.split('>');
          const col = parts[0].trim();
          const threshold = parseFloat(parts[1].trim());
          if (col === columnName) {
            return parseFloat(value) > threshold;
          }
        } else if (condition.includes('<')) {
          const parts = condition.split('<');
          const col = parts[0].trim();
          const threshold = parseFloat(parts[1].trim());
          if (col === columnName) {
            return parseFloat(value) < threshold;
          }
        } else if (condition.includes('==')) {
          const parts = condition.split('==');
          const col = parts[0].trim();
          const expected = parts[1].trim().replace(/['"]/g, '');
          if (col === columnName) {
            return String(value) === expected;
          }
        }
        
        return true; // Default to include if condition doesn't match our format
      });
    } catch (error) {
      console.warn(`Error applying filter transformation: ${error}`);
      return data; // Return original data if filter fails
    }
  }

  /**
   * Apply drop column transformation
   */
  private applyDropColumnTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      return data; // No column to drop
    }

    return data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
  }

  /**
   * Apply rename column transformation
   */
  private applyRenameColumnTransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    
    if (!columnName || !targetValue) {
      return data; // No renaming to perform
    }

    return data.map(row => {
      const newRow = { ...row };
      if (newRow.hasOwnProperty(columnName)) {
        newRow[targetValue] = newRow[columnName];
        delete newRow[columnName];
      }
      return newRow;
    });
  }

  /**
   * Apply normalize transformation
   */
  private applyNormalizeTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      return data; // No column to normalize
    }

    // Extract values to normalize
    const values = data.map(row => parseFloat(row[columnName])).filter(val => !isNaN(val));
    if (values.length === 0) return data;

    // Calculate min and max
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    // Normalize values to 0-1 range
    return data.map(row => {
      if (row.hasOwnProperty(columnName) && !isNaN(parseFloat(row[columnName]))) {
        const val = parseFloat(row[columnName]);
        if (range !== 0) {
          row[columnName] = (val - min) / range;
        }
      }
      return row;
    });
  }

  /**
   * Apply fill NA transformation
   */
  private applyFillNATransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    
    if (!columnName) {
      return data; // No column specified
    }

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && 
          (row[columnName] === null || row[columnName] === undefined || row[columnName] === '')) {
        row[columnName] = targetValue || '';
      }
      return row;
    });
  }

  /**
   * Apply trim transformation
   */
  private applyTrimTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      // Trim all string values in all columns
      return data.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          if (typeof newRow[key] === 'string') {
            newRow[key] = (newRow[key] as string).trim();
          }
        }
        return newRow;
      });
    }

    // Trim only the specified column
    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).trim();
      }
      return row;
    });
  }

  /**
   * Apply to upper case transformation
   */
  private applyToUpperTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      // Convert all string values in all columns to uppercase
      return data.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          if (typeof newRow[key] === 'string') {
            newRow[key] = (newRow[key] as string).toUpperCase();
          }
        }
        return newRow;
      });
    }

    // Convert only the specified column to uppercase
    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).toUpperCase();
      }
      return row;
    });
  }

  /**
   * Apply to lower case transformation
   */
  private applyToLowerTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      // Convert all string values in all columns to lowercase
      return data.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          if (typeof newRow[key] === 'string') {
            newRow[key] = (newRow[key] as string).toLowerCase();
          }
        }
        return newRow;
      });
    }

    // Convert only the specified column to lowercase
    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).toLowerCase();
      }
      return row;
    });
  }
}