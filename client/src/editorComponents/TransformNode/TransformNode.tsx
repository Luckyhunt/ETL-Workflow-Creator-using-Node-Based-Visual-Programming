import React, { useState, useEffect, type FC } from "react";
import { TransformType, type NodeProps } from "../../types";
import { useWorkflow } from "../../contexts/useWorkflow";
import { workflowExecutionService } from "../../services/WorkflowExecutionService";
import "./TransformNode.css";

// Helper function to parse CSV lines properly handling quoted fields
const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && !inQuotes) {
            // Start of quoted field
            inQuotes = true;
        } else if (char === '"' && inQuotes) {
            if (nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // End of quoted field
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current);
            current = '';
        } else {
            // Regular character
            current += char;
        }
    }
    
    // Add last field
    result.push(current);
    return result;
};

// Helper function to detect data type of a value
const detectDataType = (value: any): 'string' | 'number' | 'unknown' => {
    if (value === null || value === undefined || value === '') {
        return 'unknown';
    }
    
    // Try to convert to number
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && isFinite(numValue)) {
        return 'number';
    }
    
    // Check if it's a string
    if (typeof value === 'string') {
        return 'string';
    }
    
    return 'unknown';
};

// Get relevant transformations based on data type
const getRelevantTransformations = (dataType: 'string' | 'number' | 'unknown'): TransformType[] => {
    if (dataType === 'string') {
        return [
            TransformType.TO_UPPER,
            TransformType.TO_LOWER,
            TransformType.TRIM,
            TransformType.STRIP_WHITESPACE,
            TransformType.REMOVE_SPECIAL_CHARS,
            TransformType.EXTRACT_NUMBERS,
            TransformType.EXTRACT_STRINGS,
            TransformType.CONVERT_TO_NUMERIC,
            TransformType.FILTER,
            TransformType.DROP_COLUMN,
            TransformType.RENAME_COLUMN,
            TransformType.FILL_NA
        ];
    } else if (dataType === 'number') {
        return [
            TransformType.ROUND_NUMBERS,
            TransformType.FORMAT_NUMBERS,
            TransformType.CONVERT_TO_STRING,
            TransformType.NORMALIZE,
            TransformType.FILTER,
            TransformType.DROP_COLUMN,
            TransformType.RENAME_COLUMN,
            TransformType.FILL_NA
        ];
    } else {
        // For unknown type, show general transformations
        return [
            TransformType.NONE,
            TransformType.FILTER,
            TransformType.DROP_COLUMN,
            TransformType.RENAME_COLUMN,
            TransformType.FILL_NA
        ];
    }
};

const TransformNode: FC<NodeProps> = (props: NodeProps) => {
    const { workflow, updateNode } = useWorkflow();
    const [selectedTransform, setSelectedTransform] = useState<string>(TransformType.NONE);
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [additionalParam, setAdditionalParam] = useState<string>('');
    const [condition, setCondition] = useState<string>('');
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [columnDataType, setColumnDataType] = useState<'string' | 'number' | 'unknown'>('unknown');
    const [sampleData, setSampleData] = useState<any[]>([]);
    const [relevantTransformations, setRelevantTransformations] = useState<TransformType[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
    
    // Initialize from existing node data only if state is not already set
    useEffect(() => {
        const transformData = props.node.data as any;
        // Only initialize if transform type is not yet set (to prevent resetting user selections)
        if (transformData && selectedTransform === TransformType.NONE && !transformData.transformType) { 
            setSelectedTransform(transformData.transformType || TransformType.NONE);
            setSelectedColumn(transformData.columnName || '');
            setAdditionalParam(transformData.targetValue || '');
            setCondition(transformData.condition || '');
        }
    }, [props.node.data, selectedTransform]);
    
    // Get available columns and sample data from connected input node or transform node
    useEffect(() => {
        const findConnectedNode = () => {
            const nodeId = props.node._id;
            const edge = workflow.definition.edges.find(e => e.target._id === nodeId);
            if (edge) {
                // Accept data from input nodes OR transform nodes (for chaining)
                const sourceNode = workflow.definition.nodes.find(
                    n => n._id === edge.source._id && (n.type === 'input' || n.type === 'transform')
                );
                if (sourceNode && sourceNode.data) {
                    const sourceData = sourceNode.data as any;
                    
                    // First try to use previewData (available for all formats: CSV, JSON, XML, and from transforms)
                    const previewData = sourceData.previewData;
                    if (previewData && previewData.length > 0) {
                        // Extract columns from previewData
                        const allKeys = new Set<string>();
                        previewData.forEach((row: any) => {
                            if (row && typeof row === 'object') {
                                Object.keys(row).forEach(key => allKeys.add(key));
                            }
                        });
                        const headers = Array.from(allKeys).sort();
                        setAvailableColumns(headers);
                        setSampleData(previewData.slice(0, 5)); // First 5 rows as sample
                        
                        // Only set the first column if no column is currently selected
                        if (headers.length > 0 && !selectedColumn && !props.node.data) {
                            setSelectedColumn(headers[0]);
                        }
                        return;
                    }
                    
                    // Fallback: parse CSV from fileContent (old format, only for input nodes)
                    if (sourceNode.type === 'input') {
                        const fileContent = sourceData.file?.fileContent;
                        if (fileContent) {
                            // Parse CSV properly handling quoted fields
                            const lines: string[] = fileContent.split('\n').filter((line: string) => line.trim() !== '');
                            if (lines.length > 0) {
                                // Parse header line properly
                                const headers: string[] = parseCSVLine(lines[0]);
                                setAvailableColumns(headers);
                                
                                // Parse sample data (first 5 rows)
                                const sampleRows = [];
                                const maxRows = Math.min(6, lines.length); // Header + 5 data rows
                                for (let i = 1; i < maxRows; i++) {
                                    const values = parseCSVLine(lines[i]);
                                    const row: any = {};
                                    for (let j = 0; j < headers.length; j++) {
                                        row[headers[j]] = values[j] !== undefined ? values[j].trim() : '';
                                    }
                                    sampleRows.push(row);
                                }
                                setSampleData(sampleRows);
                                
                                // Only set the first column if no column is currently selected
                                if (headers.length > 0 && !selectedColumn && !props.node.data) {
                                    setSelectedColumn(headers[0]);
                                }
                            }
                        }
                    }
                }
            }
        };
        
        findConnectedNode();
    }, [workflow, props.node._id, selectedColumn, props.node.data]);
    
    // Detect data type when column changes
    useEffect(() => {
        if (selectedColumn && sampleData.length > 0) {
            // Get values from the selected column
            const columnValues = sampleData.map(row => row[selectedColumn]).filter(val => val !== '');
            
            if (columnValues.length > 0) {
                // Detect data type based on sample values
                const dataTypes = columnValues.map(detectDataType);
                
                // Find the most common data type
                const typeCounts = {
                    string: dataTypes.filter(t => t === 'string').length,
                    number: dataTypes.filter(t => t === 'number').length,
                    unknown: dataTypes.filter(t => t === 'unknown').length
                };
                
                let detectedType: 'string' | 'number' | 'unknown' = 'unknown';
                if (typeCounts.number > typeCounts.string && typeCounts.number > typeCounts.unknown) {
                    detectedType = 'number';
                } else if (typeCounts.string > typeCounts.number && typeCounts.string > typeCounts.unknown) {
                    detectedType = 'string';
                }
                
                setColumnDataType(detectedType);
                setRelevantTransformations(getRelevantTransformations(detectedType));
            } else {
                setColumnDataType('unknown');
                setRelevantTransformations(getRelevantTransformations('unknown'));
            }
        } else {
            setColumnDataType('unknown');
            setRelevantTransformations(getRelevantTransformations('unknown'));
        }
    }, [selectedColumn, sampleData]);

    // Clear parameters when transformation type changes to prevent confusion
    useEffect(() => {
        // Clear condition and additional param when switching transformation types
        // Only clear if the new transformation type is different from the current one
        const currentTransformType = (props.node.data as any)?.transformType;
        if (currentTransformType && currentTransformType !== selectedTransform) {
            setCondition('');
            setAdditionalParam('');
        }
    }, [selectedTransform, props.node.data]);

    // Update preview when transform parameters change (excluding sampleData to avoid constant updates)
    useEffect(() => {
        const updatePreview = async () => {
            // If NONE selected, just pass through original data without transformation
            if (selectedTransform === TransformType.NONE) {
                updateNode(props.node._id, {
                    ...props.node.data,
                    transformType: selectedTransform as any,
                    columnName: selectedColumn,
                    targetValue: additionalParam,
                    condition: condition,
                    previewData: sampleData
                });
                return;
            }
            
            if (sampleData.length > 0 && selectedColumn) {
                setIsLoadingPreview(true);
                
                try {
                    // Prepare parameters for the transformation
                    const params: any = { columnName: selectedColumn };
                    
                    if (condition) {
                        params.condition = condition;
                    }
                    
                    if (additionalParam) {
                        params.targetValue = additionalParam;
                    }
                    
                    // Apply transformation using backend service
                    const result = await workflowExecutionService.applyTransformation(
                        sampleData, 
                        selectedTransform.toLowerCase(), 
                        params
                    );
                    
                    if (result.success) {
                        // Send preview data to the workflow context for the Previewer
                        updateNode(props.node._id, {
                            ...props.node.data,
                            transformType: selectedTransform as any,
                            columnName: selectedColumn,
                            targetValue: additionalParam,
                            condition: condition,
                            previewData: result.data || []
                        });
                    } else {
                        console.error('Transformation failed:', result.error);
                        // Send original data as fallback
                        updateNode(props.node._id, {
                            ...props.node.data,
                            transformType: selectedTransform as any,
                            columnName: selectedColumn,
                            targetValue: additionalParam,
                            condition: condition,
                            previewData: sampleData
                        });
                    }
                } catch (error) {
                    console.error('Error updating preview:', error);
                    // Send original data as fallback
                    updateNode(props.node._id, {
                        ...props.node.data,
                        transformType: selectedTransform as any,
                        columnName: selectedColumn,
                        targetValue: additionalParam,
                        condition: condition,
                        previewData: sampleData
                    });
                } finally {
                    setIsLoadingPreview(false);
                }
            } else {
                // Send original data when no transformation is selected
                updateNode(props.node._id, {
                    ...props.node.data,
                    transformType: selectedTransform as any,
                    columnName: selectedColumn,
                    targetValue: additionalParam,
                    condition: condition,
                    previewData: sampleData
                });
            }
        };
        
        updatePreview();
    }, [selectedTransform, selectedColumn, condition, additionalParam]); // Removed sampleData from dependencies to prevent constant updates
    
    // Update preview when sampleData changes, but only if transform settings remain the same
    useEffect(() => {
        // Only update preview if we have a valid transformation selected
        if (sampleData.length > 0 && selectedTransform !== 'transform' && selectedColumn) {
            // Create a timer to debounce the update
            const timer = setTimeout(() => {
                const updatePreviewOnDataChange = async () => {
                    setIsLoadingPreview(true);
                    
                    try {
                        // Prepare parameters for the transformation
                        const params: any = { columnName: selectedColumn };
                        
                        if (condition) {
                            params.condition = condition;
                        }
                        
                        if (additionalParam) {
                            params.targetValue = additionalParam;
                        }
                        
                        // Apply transformation using backend service
                        const result = await workflowExecutionService.applyTransformation(
                            sampleData, 
                            selectedTransform.toLowerCase(), 
                            params
                        );
                        
                        if (result.success) {
                            // Send preview data to the workflow context for the Previewer
                            updateNode(props.node._id, {
                                ...props.node.data,
                                transformType: selectedTransform as any,
                                columnName: selectedColumn,
                                targetValue: additionalParam,
                                condition: condition,
                                previewData: result.data || []
                            });
                        } else {
                            console.error('Transformation failed:', result.error);
                            // Send original data as fallback
                            updateNode(props.node._id, {
                                ...props.node.data,
                                transformType: selectedTransform as any,
                                columnName: selectedColumn,
                                targetValue: additionalParam,
                                condition: condition,
                                previewData: sampleData
                            });
                        }
                    } catch (error) {
                        console.error('Error updating preview on data change:', error);
                        // Send original data as fallback
                        updateNode(props.node._id, {
                            ...props.node.data,
                            transformType: selectedTransform as any,
                            columnName: selectedColumn,
                            targetValue: additionalParam,
                            condition: condition,
                            previewData: sampleData
                        });
                    } finally {
                        setIsLoadingPreview(false);
                    }
                };
                
                updatePreviewOnDataChange();
            }, 300); // 300ms debounce delay
            
            // Cleanup function to cancel timeout if dependencies change
            return () => clearTimeout(timer);
        };
    }, [sampleData, selectedTransform, selectedColumn, condition, additionalParam, updateNode, props.node._id]);
    
    // Determine if the selected transformation requires additional parameters
    const showAdditionalParams = [
        TransformType.CONVERT_TO_NUMERIC,
        TransformType.ROUND_NUMBERS,
        TransformType.FORMAT_NUMBERS,
        TransformType.REMOVE_SPECIAL_CHARS,
        TransformType.EXTRACT_NUMBERS,
        TransformType.EXTRACT_STRINGS
    ].includes(selectedTransform as any);

    // Determine if the selected transformation requires condition
    const showCondition = [
        TransformType.FILTER
    ].includes(selectedTransform as any);

    // Determine if the selected transformation requires target value (for rename, fill_na)
    const showTargetValue = [
        TransformType.RENAME_COLUMN,
        TransformType.FILL_NA
    ].includes(selectedTransform as any);

    return (
        <div className="common-node-body transformnode-body">
            <div className="common-node-select-container">
                <label htmlFor="column" className="common-node-label">
                    Select Column {selectedColumn && `(${columnDataType === 'string' ? 'String' : columnDataType === 'number' ? 'Numeric' : 'Unknown'})`}
                </label>
                <select
                    name="column"
                    className="common-node-select"
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                >
                    <option value="" disabled>Select a column...</option>
                    {
                        availableColumns.map(col => <option key={col} value={col}>{col}</option>)
                    }
                </select>
            </div>
        
            <div className="common-node-select-container">
                <label htmlFor="transform" className="common-node-label">Select Transformation</label>
                <select
                    name="transform"
                    className="common-node-select"
                    value={selectedTransform}
                    onChange={(e) => setSelectedTransform(e.target.value)}
                >
                    <option value={TransformType.NONE}>Select a transformation...</option>
                    {
                        relevantTransformations.filter(t => t !== TransformType.NONE).map(type => <option key={type} value={type}>{ type }</option>)
                    }
                </select>
            </div>
        
            {/* Additional parameters for specific transformations */}
            {showAdditionalParams && (
                <div className="common-node-input-container">
                    <label htmlFor="param" className="common-node-label">
                        {selectedTransform === TransformType.ROUND_NUMBERS || selectedTransform === TransformType.FORMAT_NUMBERS 
                            ? "Decimal Places" 
                            : selectedTransform === TransformType.REMOVE_SPECIAL_CHARS
                            ? "Pattern to Remove"
                            : "Parameter"}
                    </label>
                    <input
                        className="common-node-input"
                        type="text"
                        name="param"
                        value={additionalParam}
                        onChange={(e) => setAdditionalParam(e.target.value)}
                        placeholder="Enter parameter..."
                    />
                </div>
            )}
            
            {/* Target value for rename and fill_na operations */}
            {showTargetValue && (
                <div className="common-node-input-container">
                    <label htmlFor="targetValue" className="common-node-label">
                        {selectedTransform === TransformType.RENAME_COLUMN ? "New Column Name" : "Fill Value"}
                    </label>
                    <input
                        className="common-node-input"
                        type="text"
                        name="targetValue"
                        value={additionalParam}
                        onChange={(e) => setAdditionalParam(e.target.value)}
                        placeholder={selectedTransform === TransformType.RENAME_COLUMN ? "Enter new column name..." : "Enter fill value..."}
                    />
                </div>
            )}
            
            {/* Condition field only for filter operations */}
            {showCondition && (
                <div className="common-node-input-container">
                    <label htmlFor="condition" className="common-node-label">Condition</label>
                    <input
                        className="common-node-input"
                        type="text"
                        name="condition"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="Eg. age >= 20"
                    />
                </div>
            )}
        </div>
    )
}

export default TransformNode;
