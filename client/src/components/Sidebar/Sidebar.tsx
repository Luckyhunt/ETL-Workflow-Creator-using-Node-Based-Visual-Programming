import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { useNavigate, Link } from "react-router-dom";
import type { WorkflowNode } from "../../types"
import { TransformType } from "../../types"
import { useWorkflow } from "../../contexts/useWorkflow"
import Logo from "../../images/logo.svg"
import "./Sidebar.css"
import { LuFileInput } from "react-icons/lu"
import { IoSettingsOutline } from "react-icons/io5"
import { HiLightningBolt } from "react-icons/hi";
import { FaPlay } from "react-icons/fa";
import { FaShareFromSquare } from "react-icons/fa6";
import { MdSave } from "react-icons/md";
import { MdBarChart } from "react-icons/md";
import { workflowExecutionService } from "../../services/WorkflowExecutionService";

const Sidebar = () => {

    const [open, setOpen] = useState<boolean>(true)
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [showGraphModal, setShowGraphModal] = useState<boolean>(false)
    const [graphType, setGraphType] = useState<string>('bar')
    const [xColumn, setXColumn] = useState<string>('')
    const [yColumn, setYColumn] = useState<string>('')
    const [availableColumns, setAvailableColumns] = useState<string[]>([])
    const [numericColumns, setNumericColumns] = useState<string[]>([])
    const navigate = useNavigate()
    const { workflow, addNode, deleteDraft, shareWorkflow, updateNode } = useWorkflow()

    const createNewInputNode = () => {
        const newInputNode: WorkflowNode = {
            _id: uuidv4(),
            type: "input",
            position: { x: 400, y: 40 },
            data: {
                file: {
                    filename: "",
                    fileContent: "",
                    fileFormat: 'NA'
                }
            },
        }
        addNode(newInputNode)
    }

    const createNewTransformNode = () => {
        const newTransformNode: WorkflowNode = {
            _id: uuidv4(),
            type: "transform",
            position: {x: 500, y: 100},
            data: {
                transformType: TransformType.FILTER,
                columnName: '',
                condition: ''
            }
        }
        addNode(newTransformNode)
    }

    const createNewOutputNode = () => {
        const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output')
        const outputNumber = outputNodes.length + 1
        const outputName = `Output ${outputNumber}`
        
        const newOutputNode: WorkflowNode = {
            _id: uuidv4(),
            type: 'output',
            position: {x: 600, y: 200},
            name: outputName,
            data: {
                file: {
                    filename: outputName.toLowerCase().replace(/\s+/g, '_') + '.json',
                    fileContent: '',
                    fileFormat: 'NA'
                }
            }
        }
        addNode(newOutputNode)
    }

    const executeWorkflow = async () => {
        try {
            setIsExecuting(true);
            const result = await workflowExecutionService.executeWorkflow(workflow);
            
            if (result.success) {
                const results = result.results || {};
                const outputNodeIds = Object.keys(results).filter(id => {
                    const node = workflow.definition.nodes.find(n => n._id === id);
                    return node?.type === 'output';
                });
                
                let finalData = null;
                let finalNodeId = null;
                
                if (outputNodeIds.length > 0) {
                    finalNodeId = outputNodeIds[outputNodeIds.length - 1];
                    finalData = results[finalNodeId]?.data;
                } else {
                    const transformNodeIds = Object.keys(results).filter(id => {
                        const node = workflow.definition.nodes.find(n => n._id === id);
                        return node?.type === 'transform';
                    });
                    if (transformNodeIds.length > 0) {
                        finalNodeId = transformNodeIds[transformNodeIds.length - 1];
                        finalData = results[finalNodeId]?.data;
                    }
                }
                
                if (finalData && finalNodeId) {
                    const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
                    
                    // Update all output nodes with the final data
                    outputNodes.forEach((outputNode, index) => {
                        const outputData = outputNode.data as { file: any };
                        const outputName = outputNodes.length > 1 ? `Output ${index + 1}` : 'Output';
                            
                        updateNode(outputNode._id, {
                            file: {
                                ...outputData.file,
                                filename: outputData.file?.filename || `${outputName.toLowerCase().replace(/\s+/g, '_')}.json`,
                                content: JSON.stringify(finalData, null, 2),
                                processedData: finalData
                            }
                        });
                    });
                }
                
                console.log("Final Output:", finalData);
            } else {
                console.error("Execution error:", result.error);
            }
        } catch (error) {
            console.error("Error executing workflow:", error);
        } finally {
            setIsExecuting(false);
        }
    };

    const generateGraph = async () => {
        const outputNode = workflow.definition.nodes.find(n => n.type === 'output');
        const outputData = outputNode?.data as any;
        const processedData = outputData?.file?.processedData || [];
        
        if (!processedData || processedData.length === 0) {
            alert('No processed data available. Please run the workflow first.');
            return;
        }
        
        const columns = Object.keys(processedData[0]);
        const numericColumns = columns.filter(col => 
            typeof processedData[0][col] === 'number'
        );
        
        if (numericColumns.length === 0) {
            alert('No numeric columns found for graph generation.');
            return;
        }
        
        const xCol = columns[0];
        const yCol = numericColumns[0];
        
        try {
            const result = await workflowExecutionService.generateGraph(
                processedData, 
                graphType, 
                xCol, 
                yCol, 
                `Graph: ${yCol} by ${xCol}`
            );
            
            if (result.success && result.graph_url) {
                const graphWindow = window.open('', '_blank', 'width=800,height=600');
                if (graphWindow) {
                    graphWindow.document.write(`
                        <html>
                            <head><title>Workflow Graph</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;">
                                <img src="${result.graph_url}" style="max-width:100%;max-height:100%;" />
                            </body>
                        </html>
                    `);
                }
            } else {
                alert('Failed to generate graph: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating graph:', error);
            alert('Error generating graph. Please ensure the backend is running.');
        }
    };

    return (
        <div className={open ? "sidebar" : "sidebar close"}>
            <div className="sidebar-btn">
                <button className="toggle-btn" onClick={() => setOpen(!open)}>
                    {open ? "<<" : ">>"}
                </button>
            </div>
            <Link to="/">
                <div className="sidebar-logo logo-container">
                    <img src={Logo} alt="" />
                    <span className="sidebar-logo-name">NodeFlow</span>
                </div>
            </Link>
            <div className="sidebar-contents">
                <div className="sidebar-part">
                    <div className="sidebar-part-title">Editor Nodes</div>
                    <ul className="sidebar-part-nodes">
                        <li className="sidebar-part-node-item">
                            <button onClick={createNewInputNode}>
                                <span className="icon"><LuFileInput /></span> File Input Node
                            </button>
                        </li>
                        <li className="sidebar-part-node-item">
                            <button onClick={createNewTransformNode}>
                                <span className="icon"><IoSettingsOutline /></span> Transformation
                            </button>
                        </li>
                        <li className="sidebar-part-node-item">
                            <button onClick={createNewOutputNode}>
                                <span className="icon"><HiLightningBolt /></span> Result
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-part">
                    <div className="sidebar-part-title">MANAGEMENT</div>
                    <div className="management-primary-action">
                        <button className="execute-workflow-btn" onClick={executeWorkflow} disabled={isExecuting}>
                            {isExecuting ? 'Executing...' : 'Run Workflow'}
                        </button>
                    </div>
                    <ul className="management-secondary-actions">
                        <li className="management-item">
                            <button onClick={() => alert('Save functionality coming soon!')}>
                                <span className="icon"><MdSave /></span> Save
                            </button>
                        </li>
                        <li className="management-item">
                            <button onClick={async () => {
                                try {
                                    const shareUrl = await shareWorkflow();
                                    await navigator.clipboard.writeText(shareUrl);
                                    alert(`Workflow shared!\n${shareUrl}`);
                                } catch (error) {
                                    alert('Failed to share workflow.');
                                }
                            }}>
                                <span className="icon"><FaShareFromSquare /></span> Share
                            </button>
                        </li>
                        <li className="management-item">
                            <button onClick={() => {
                                // Get data from LAST output node in the chain
                                const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
                                const lastOutputNode = outputNodes[outputNodes.length - 1];
                                const processedData = (lastOutputNode?.data as any)?.file?.processedData || [];
                                
                                if (!processedData || processedData.length === 0) {
                                    alert('No processed data available. Run workflow first.');
                                    return;
                                }
                                
                                // Extract columns
                                const columns = Object.keys(processedData[0]);
                                const numericCols = columns.filter(col => 
                                    typeof processedData[0][col] === 'number'
                                );
                                
                                setAvailableColumns(columns);
                                setNumericColumns(numericCols);
                                setXColumn(columns[0] || '');
                                setYColumn(numericCols[0] || '');
                                setShowGraphModal(true);
                            }}>
                                <span className="icon"><MdBarChart /></span> Show Graph
                            </button>
                        </li>
                        <li className="management-item destructive">
                            <button onClick={async () => {
                                if (!window.confirm("Delete this draft?")) return;
                                try {
                                    await deleteDraft();
                                    navigate("/");
                                } catch (error) {
                                    alert("Failed to delete draft.");
                                }
                            }}>
                                <span className="icon">🗑️</span> Delete Draft
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            
            {/* Graph Configuration Modal */}
            {showGraphModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        padding: '0',
                        borderRadius: '12px',
                        minWidth: '350px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '20px',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 style={{ 
                                margin: 0, 
                                color: '#1f2937',
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>Graph Configuration</h3>
                        </div>
                        
                        <div style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ 
                                    color: '#6b7280', 
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px'
                                }}>Graph Type</label>
                                <select 
                                    value={graphType}
                                    onChange={(e) => setGraphType(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        marginTop: '6px',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="bar">Bar Chart</option>
                                    <option value="line">Line Chart</option>
                                    <option value="scatter">Scatter Plot</option>
                                    <option value="pie">Pie Chart</option>
                                    <option value="hist">Histogram</option>
                                </select>
                            </div>
                            
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ 
                                    color: '#6b7280', 
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px'
                                }}>X Axis (Category)</label>
                                <select
                                    value={xColumn}
                                    onChange={(e) => setXColumn(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        marginTop: '6px',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                >
                                    {availableColumns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ 
                                    color: '#6b7280', 
                                    fontSize: '12px',
                                    textTransform: 'uppercase',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px'
                                }}>Y Axis (Value)</label>
                                <select
                                    value={yColumn}
                                    onChange={(e) => setYColumn(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px', 
                                        marginTop: '6px',
                                        backgroundColor: '#ffffff',
                                        color: '#1f2937',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">None (Count)</option>
                                    {numericColumns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={async () => {
                                        const outputNode = workflow.definition.nodes.find(n => n.type === 'output');
                                        const processedData = (outputNode?.data as any)?.file?.processedData || [];
                                        
                                        try {
                                            const result = await workflowExecutionService.generateGraph(
                                                processedData,
                                                graphType,
                                                xColumn,
                                                yColumn || undefined,
                                                `${yColumn || 'Count'} by ${xColumn}`
                                            );
                                            
                                            if (result.success && result.graph_url) {
                                                const graphWindow = window.open('', '_blank', 'width=800,height=600');
                                                if (graphWindow) {
                                                    graphWindow.document.write(`
                                                        <html>
                                                            <head><title>Workflow Graph</title></head>
                                                            <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;">
                                                                <div style="background:#ffffff;padding:20px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.1);">
                                                                    <img src="${result.graph_url}" style="max-width:100%;max-height:80vh;border-radius:8px;" />
                                                                </div>
                                                            </body>
                                                        </html>
                                                    `);
                                                }
                                                setShowGraphModal(false);
                                            } else {
                                                alert('Failed to generate graph: ' + (result.error || 'Unknown error'));
                                            }
                                        } catch (error) {
                                            console.error('Error generating graph:', error);
                                            alert('Error generating graph. Check backend.');
                                        }
                                    }}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        backgroundColor: '#3b82f6', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Generate Graph
                                </button>
                                <button
                                    onClick={() => setShowGraphModal(false)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        backgroundColor: '#f3f4f6', 
                                        color: '#4b5563', 
                                        border: '1px solid #d1d5db', 
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Sidebar
