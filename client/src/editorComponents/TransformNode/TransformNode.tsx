import React, { useState, useEffect, type FC } from "react";
import { TransformType, type NodeProps } from "../../types";
import { useWorkflow } from "../../contexts/useWorkflow";
import "./TransformNode.css";

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
    const allTransforms = Object.values(TransformType);
    
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
            TransformType.FILTER,
            TransformType.DROP_COLUMN,
            TransformType.RENAME_COLUMN,
            TransformType.FILL_NA
        ];
    }
};

const TransformNode: FC<NodeProps> = (props: NodeProps) => {
    // Use props to satisfy linter
    React.useMemo(() => props, [props]);
    
    const { workflow, updateNode } = useWorkflow();
    const [selectedTransform, setSelectedTransform] = useState<string>('transform');
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [additionalParam, setAdditionalParam] = useState<string>('');
    const [condition, setCondition] = useState<string>('');
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [columnDataType, setColumnDataType] = useState<'string' | 'number' | 'unknown'>('unknown');
    const [sampleData, setSampleData] = useState<any[]>([]);
    const [relevantTransformations, setRelevantTransformations] = useState<TransformType[]>([]);
    
    // Initialize from existing node data
    useEffect(() => {
        const transformData = props.node.data as any;
        if (transformData) {
            setSelectedTransform(transformData.transformType || 'transform');
            setSelectedColumn(transformData.columnName || '');
            setAdditionalParam(transformData.targetValue || '');
            setCondition(transformData.condition || '');
        }
    }, [props.node.data]);
    
    // Update node data when selections change
    useEffect(() => {
        if (selectedTransform !== 'transform') { // Only update if a valid transform is selected
            updateNode(props.node._id, {
                ...props.node.data,
                transformType: selectedTransform as any, // Type assertion since we know it's a valid TransformType
                columnName: selectedColumn,
                targetValue: additionalParam,
                condition: condition
            });
        }
    }, [selectedTransform, selectedColumn, additionalParam, condition]);
    
    // Get available columns and sample data from connected input node
    useEffect(() => {
        const findConnectedInputNode = () => {
            const nodeId = props.node._id;
            const edge = workflow.definition.edges.find(e => e.target._id === nodeId);
            if (edge) {
                const inputNode = workflow.definition.nodes.find(n => n._id === edge.source._id && n.type === 'input');
                if (inputNode && inputNode.data) {
                    const fileContent = (inputNode.data as any).file?.fileContent;
                    if (fileContent) {
                        // Parse CSV to get headers/columns and sample data
                        const lines: string[] = fileContent.split('\n').filter((line: string) => line.trim() !== '');
                        if (lines.length > 0) {
                            const headers: string[] = lines[0].split(',').map((header: string) => header.trim());
                            setAvailableColumns(headers);
                            
                            // Parse sample data (first 5 rows)
                            const sampleRows = [];
                            const maxRows = Math.min(6, lines.length); // Header + 5 data rows
                            for (let i = 1; i < maxRows; i++) {
                                const values = lines[i].split(',');
                                const row: any = {};
                                for (let j = 0; j < headers.length; j++) {
                                    row[headers[j]] = values[j]?.trim() || '';
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
        };
        
        findConnectedInputNode();
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

    const transformations = Object.values(TransformType).map(type => type);
    
    // Determine if the selected transformation requires additional parameters
    const showAdditionalParams = [
        TransformType.CONVERT_TO_NUMERIC,
        TransformType.ROUND_NUMBERS,
        TransformType.FORMAT_NUMBERS,
        TransformType.REMOVE_SPECIAL_CHARS,
        TransformType.EXTRACT_NUMBERS,
        TransformType.EXTRACT_STRINGS
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
                    <option value="transform" disabled>Select a transformation...</option>
                    {
                        relevantTransformations.map(type => <option key={type} value={type}>{ type }</option>)
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
        </div>
    )
}

export default TransformNode