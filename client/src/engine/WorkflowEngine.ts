import type { Workflow, WorkflowNode } from "../types";
import { TransformType } from "../types";
import { parseXMLToArray } from "../utils/dataParser";

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


export class WorkflowEngine {
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

      // 2. Execute per output node - each output gets its own upstream path
      const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
      const nodeResults: Record<string, any> = {};
      const allOutputResults: Record<string, any> = {};

      for (const outputNode of outputNodes) {
        // Get the upstream path for this output node
        const upstreamPath = this.getUpstreamPath(outputNode._id, workflow);
        
        // Execute the path for this output
        const pathResult = await this.executePath(upstreamPath, workflow, nodeResults);
        
        if (!pathResult.success) {
          return {
            success: false,
            error: `Execution failed for output node ${outputNode._id}: ${pathResult.error}`,
            nodeResults
          };
        }
        
        // Store result for this output node
        allOutputResults[outputNode._id] = pathResult.data;
        nodeResults[outputNode._id] = pathResult.data;
      }

      return {
        success: true,
        data: allOutputResults,
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
   * Get upstream path from output node to input nodes
   * Returns nodes in execution order: input -> transforms -> output
   */
  private getUpstreamPath(outputNodeId: string, workflow: Workflow): WorkflowNode[] {
    const path: WorkflowNode[] = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = workflow.definition.nodes.find(n => n._id === nodeId);
      if (!node) return;
      
      // Add to path (we'll reverse at the end)
      path.push(node);
      
      // Find all nodes that feed into this node (reverse edges)
      const sourceEdges = workflow.definition.edges.filter(e => e.target._id === nodeId);
      for (const edge of sourceEdges) {
        traverse(edge.source._id);
      }
    };
    
    // Start from output and traverse backwards
    traverse(outputNodeId);
    
    // Reverse to get execution order: input -> transforms -> output
    return path.reverse();
  }

  /**
   * Execute a path of nodes sequentially
   */
  private async executePath(
    path: WorkflowNode[], 
    workflow: Workflow, 
    globalResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const pathResults: Record<string, any> = {};
    
    console.log(`[DEBUG] Executing path with ${path.length} nodes:`, path.map(n => `${n.type}(${n._id.slice(0,8)})`));
    
    for (const node of path) {
      console.log(`[DEBUG] Executing ${node.type} node ${node._id.slice(0,8)}...`);
      const result = await this.executeNodeInPath(node, workflow, pathResults, globalResults);
      
      if (!result.success) {
        return {
          success: false,
          error: `Node ${node._id} (${node.type}) execution failed: ${result.error}`
        };
      }
      
      pathResults[node._id] = result.data;
      
      // Log data sample for debugging
      if (Array.isArray(result.data) && result.data.length > 0) {
        console.log(`[DEBUG] ${node.type} result columns:`, Object.keys(result.data[0]));
      }
    }
    
    // Return the last node's result (the output node)
    const lastNode = path[path.length - 1];
    console.log(`[DEBUG] Path complete. Final output columns:`, Array.isArray(pathResults[lastNode._id]) && pathResults[lastNode._id].length > 0 ? Object.keys(pathResults[lastNode._id][0]) : 'N/A');
    return {
      success: true,
      data: pathResults[lastNode._id]
    };
  }

  /**
   * Execute a single node within a path context
   */
  private async executeNodeInPath(
    node: WorkflowNode,
    workflow: Workflow,
    pathResults: Record<string, any>,
    globalResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    switch (node.type) {
      case 'input':
        return await this.executeInputNode(node, workflow, globalResults);
      case 'transform':
        return await this.executeTransformNodeInPath(node, workflow, pathResults);
      case 'output':
        return await this.executeOutputNodeInPath(node, workflow, pathResults);
      default:
        return {
          success: false,
          error: `Unknown node type: ${(node as any).type}`
        };
    }
  }

  /**
   * Execute transform node using only path context (previous results in this path)
   */
  private async executeTransformNodeInPath(
    node: WorkflowNode,
    workflow: Workflow,
    pathResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const transformData = node.data as any;
      const transformType = transformData.transformType as TransformType;
      
      // Get input data from the previous node in this path
      const sourceNodeId = this.getSourceNodeIdInPath(node._id, workflow, pathResults);
      if (!sourceNodeId) {
        return {
          success: false,
          error: `Transform node ${node._id} has no connected input data in its path`
        };
      }
      
      // Deep clone to prevent mutation across paths
      const inputData = this.deepClone(pathResults[sourceNodeId]);
      console.log(`[DEBUG] Transform ${node._id.slice(0,8)} input columns:`, Array.isArray(inputData) && inputData.length > 0 ? Object.keys(inputData[0]) : 'N/A');
      
      if (!inputData) {
        return {
          success: false,
          error: `No input data available for transform node ${node._id}`
        };
      }

      // Apply the transformation
      let result;
      switch (transformType) {
        case TransformType.NONE:
          result = inputData;
          break;
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
        case TransformType.CONVERT_TO_STRING:
          result = this.applyConvertToStringTransformation(inputData, transformData);
          break;
        case TransformType.CONVERT_TO_NUMERIC:
          result = this.applyConvertToNumericTransformation(inputData, transformData);
          break;
        case TransformType.ROUND_NUMBERS:
          result = this.applyRoundNumbersTransformation(inputData, transformData);
          break;
        case TransformType.FORMAT_NUMBERS:
          result = this.applyFormatNumbersTransformation(inputData, transformData);
          break;
        case TransformType.STRIP_WHITESPACE:
          result = this.applyStripWhitespaceTransformation(inputData, transformData);
          break;
        case TransformType.REMOVE_SPECIAL_CHARS:
          result = this.applyRemoveSpecialCharsTransformation(inputData, transformData);
          break;
        case TransformType.EXTRACT_NUMBERS:
          result = this.applyExtractNumbersTransformation(inputData, transformData);
          break;
        case TransformType.EXTRACT_STRINGS:
          result = this.applyExtractStringsTransformation(inputData, transformData);
          break;
        default:
          return {
            success: false,
            error: `Unsupported transform type: ${transformType}`
          };
      }

      console.log(`[DEBUG] Transform ${node._id.slice(0,8)} result columns:`, Array.isArray(result) && result.length > 0 ? Object.keys(result[0]) : 'N/A');

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
   * Get the source node ID that feeds into this node within the current path
   */
  private getSourceNodeIdInPath(
    nodeId: string, 
    workflow: Workflow, 
    pathResults: Record<string, any>
  ): string | null {
    // Find edges where this node is the target
    const incomingEdges = workflow.definition.edges.filter(e => e.target._id === nodeId);
    
    // Return the first source that exists in our path results
    for (const edge of incomingEdges) {
      if (pathResults.hasOwnProperty(edge.source._id)) {
        return edge.source._id;
      }
    }
    
    return null;
  }

  /**
   * Deep clone data to prevent mutation across paths
   */
  private deepClone(data: any): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map(item => this.deepClone(item));
    }
    const cloned: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(data[key]);
      }
    }
    return cloned;
  }

  /**
   * Execute output node using only path context
   */
  private async executeOutputNodeInPath(
    node: WorkflowNode,
    workflow: Workflow,
    pathResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const outputData = node.data as any;
      
      // Get input data from the source node in this path
      const sourceNodeId = this.getSourceNodeIdInPath(node._id, workflow, pathResults);
      if (!sourceNodeId) {
        return {
          success: false,
          error: `Output node ${node._id} has no connected input data in its path`
        };
      }

      const inputData = pathResults[sourceNodeId];
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
          content: outputContent,
          processedData: inputData // Include the processed data for preview
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

  // Legacy method - kept for compatibility
  async executeNode(
    node: WorkflowNode, 
    workflow: Workflow,
    nodeResults: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.executeNodeInPath(node, workflow, nodeResults, nodeResults);
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
      
      if (!inputData.file?.fileContent) {
        return {
          success: false,
          error: `Input node ${node._id} has no file content`
        };
      }

      let parsedData;
      try {
        const fileFormat = inputData.file?.fileFormat?.toLowerCase();
        if (fileFormat === 'csv') {
          parsedData = this.parseCSV(inputData.file.fileContent);
        } else if (fileFormat === 'xml') {
          parsedData = this.parseXML(inputData.file.fileContent);
        } else {
          // Default to JSON
          parsedData = JSON.parse(inputData.file.fileContent);
        }
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse input file: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        };
      }

      return {
        success: true,
        data: this.deepClone(parsedData)
      };
    } catch (error) {
      return {
        success: false,
        error: `Input node execution error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
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
   * Parse XML content into array of objects
   */
  private parseXML(xmlContent: string): any[] {
    return parseXMLToArray(xmlContent);
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
    return JSON.stringify(data, null, 2);
  }

  // ==================== TRANSFORMATION METHODS ====================

  private applyFilterTransformation(data: any[], transformData: any): any[] {
    const { columnName, condition } = transformData;
    
    if (!columnName || !condition) {
      return data;
    }

    try {
      return data.filter(row => {
        const value = row[columnName];
        if (value === undefined) return false;
        
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
        
        return true;
      });
    } catch (error) {
      console.warn(`Error applying filter transformation: ${error}`);
      return data;
    }
  }

  private applyDropColumnTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
  }

  private applyRenameColumnTransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    if (!columnName || !targetValue) return data;

    return data.map(row => {
      const newRow = { ...row };
      if (newRow.hasOwnProperty(columnName)) {
        newRow[targetValue] = newRow[columnName];
        delete newRow[columnName];
      }
      return newRow;
    });
  }

  private applyNormalizeTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    const values = data.map(row => parseFloat(row[columnName])).filter(val => !isNaN(val));
    if (values.length === 0) return data;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

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

  private applyFillNATransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && 
          (row[columnName] === null || row[columnName] === undefined || row[columnName] === '')) {
        row[columnName] = targetValue || '';
      }
      return row;
    });
  }

  private applyTrimTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
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

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).trim();
      }
      return row;
    });
  }

  private applyToUpperTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
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

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).toUpperCase();
      }
      return row;
    });
  }

  private applyToLowerTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
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

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).toLowerCase();
      }
      return row;
    });
  }

  private applyConvertToStringTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      if (row.hasOwnProperty(columnName)) {
        row[columnName] = String(row[columnName]);
      }
      return row;
    });
  }

  private applyConvertToNumericTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      if (row.hasOwnProperty(columnName)) {
        const value = row[columnName];
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            row[columnName] = numValue;
          }
        } else if (typeof value === 'number') {
          row[columnName] = value;
        } else {
          row[columnName] = Number(value);
        }
      }
      return row;
    });
  }

  private applyRoundNumbersTransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    if (!columnName) return data;

    const decimalPlaces = targetValue ? parseInt(targetValue, 10) : 0;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'number') {
        row[columnName] = Number(row[columnName].toFixed(decimalPlaces));
      }
      return row;
    });
  }

  private applyFormatNumbersTransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    if (!columnName) return data;

    const decimalPlaces = targetValue ? parseInt(targetValue, 10) : 2;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'number') {
        row[columnName] = row[columnName].toFixed(decimalPlaces);
      }
      return row;
    });
  }

  private applyStripWhitespaceTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    
    if (!columnName) {
      return data.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          if (typeof newRow[key] === 'string') {
            newRow[key] = (newRow[key] as string).replace(/\s+/g, '');
          }
        }
        return newRow;
      });
    }

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).replace(/\s+/g, '');
      }
      return row;
    });
  }

  private applyRemoveSpecialCharsTransformation(data: any[], transformData: any): any[] {
    const { columnName, targetValue } = transformData;
    if (!columnName) return data;

    const pattern = targetValue ? new RegExp(targetValue, 'g') : /[^a-zA-Z0-9\s]/g;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).replace(pattern, '');
      }
      return row;
    });
  }

  private applyExtractNumbersTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        const numbers = (row[columnName] as string).match(/\d+(?:\.\d+)?/g);
        row[columnName] = numbers ? numbers.join('') : '';
      }
      return row;
    });
  }

  private applyExtractStringsTransformation(data: any[], transformData: any): any[] {
    const { columnName } = transformData;
    if (!columnName) return data;

    return data.map(row => {
      if (row.hasOwnProperty(columnName) && typeof row[columnName] === 'string') {
        row[columnName] = (row[columnName] as string).replace(/[^a-zA-Z\s]/g, '');
      }
      return row;
    });
  }
}
