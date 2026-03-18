import { useState, useCallback, useEffect } from "react"
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from "framer-motion"
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
import { FaPlay, FaCheck, FaTimes } from "react-icons/fa";
import { FaShareFromSquare } from "react-icons/fa6";
import { MdSave } from "react-icons/md";
import { MdBarChart } from "react-icons/md";
import { workflowExecutionService } from "../../services/WorkflowExecutionService";
import { useAuth } from "../../contexts/AuthContext";
import { workflowApi } from "../../services/workflowApi";
import { useSearchParams } from "react-router-dom";
import ShareModal from "../ShareModal/ShareModal";
const Sidebar = ({ mode = 'private' }: { mode?: 'public' | 'private' }) => {

    const [open, setOpen] = useState<boolean>(true)
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [showGraphModal, setShowGraphModal] = useState<boolean>(false)
    const [graphType, setGraphType] = useState<string>('bar')
    const [xColumn, setXColumn] = useState<string>('')
    const [yColumn, setYColumn] = useState<string>('')
    const [availableColumns, setAvailableColumns] = useState<string[]>([])
    const [numericColumns, setNumericColumns] = useState<string[]>([])
    const [selectedOutputNode, setSelectedOutputNode] = useState<string>('')
    const [graphUrl, setGraphUrl] = useState<string | null>(null)
    const [showGraphDisplay, setShowGraphDisplay] = useState<boolean>(false)
    const [showShareModal, setShowShareModal] = useState<boolean>(false)
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const navigate = useNavigate()
    const [searchParams] = useSearchParams();
    const workflowId = searchParams.get('id');
    const { user } = useAuth();
    const { workflow, addNode, deleteDraft, shareWorkflow, updateNode, setWorkflowName } = useWorkflow()
    
    // PHASE 12: Ownership Check
    const isOwner = !user || workflow.user_id === user.id;

    // NEW Phase 12 renaming states
    const [localName, setLocalName] = useState(workflow.name);
    const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [nameError, setNameError] = useState<string | null>(null);

    // Sync local name when workflow state changes (e.g. on load)
    useEffect(() => {
        if (workflow.name !== localName && nameStatus === 'idle') {
            setLocalName(workflow.name);
        }
    }, [workflow.name]);

    // Debounced Auto-Save for Name
    useEffect(() => {
        if (!workflowId || localName === workflow.name || !user || !isOwner) return;
        
        const timer = setTimeout(async () => {
            if (!localName.trim()) {
                setNameError("Name cannot be empty");
                setNameStatus('error');
                return;
            }

            setNameStatus('saving');
            setNameError(null);

            try {
                // Check uniqueness first
                const isUnique = await workflowApi.checkNameUniqueness(localName, workflowId);
                if (!isUnique) {
                    setNameError("Name already exists");
                    setNameStatus('error');
                    return;
                }

                await workflowApi.updateWorkflow(workflowId, localName, workflow.definition.nodes, workflow.definition.edges);
                setWorkflowName(localName);
                setNameStatus('saved');
                setTimeout(() => setNameStatus('idle'), 3000);
            } catch (error) {
                console.error("Failed to rename:", error);
                setNameStatus('error');
                setNameError("Failed to save name");
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [localName, workflowId, user]);

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
            position: { x: 500, y: 100 },
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
            position: { x: 600, y: 200 },
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
            
            // PHASE 13: Payload Sanitization & Edge Mapping (Frontend Fix for Backend Errors)
            const replacer = (key: string, value: any) => {
                if (key === 'processedData' || key === 'previewData') return undefined;
                return value;
            };

            // Deep clone and sanitize
            const sanitizedWorkflow = JSON.parse(JSON.stringify(workflow, replacer));

            // CRITICAL FIX: Ensure source/target are objects for the backend
            // The backend does edge['source']['_id'], so they MUST be objects.
            const formattedEdges = workflow.definition.edges.map(edge => ({
                ...edge,
                source: typeof edge.source === 'string' ? { _id: edge.source } : { _id: edge.source._id },
                target: typeof edge.target === 'string' ? { _id: edge.target } : { _id: edge.target._id }
            }));

            sanitizedWorkflow.definition.edges = formattedEdges;

            // Debug Logging as requested
            console.log("Sending:", { 
                nodes: sanitizedWorkflow.definition.nodes, 
                edges: sanitizedWorkflow.definition.edges 
            });

            const result = await workflowExecutionService.executeWorkflow(sanitizedWorkflow);

            // Handle potential string response if service didn't parse it
            const data = typeof result === 'string' ? JSON.parse(result) : result;
            
            console.log("Response type:", typeof data);
            console.log("Response:", data);

            if (data?.success) {
                const results = data.results || {};

                // Update each output node with its OWN execution result
                const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');

                outputNodes.forEach((outputNode, index) => {
                    const nodeResult = results[outputNode._id];
                    if (!nodeResult) return;

                    const outputData = outputNode.data as { file: any };
                    const outputName = outputNodes.length > 1 ? `Output ${index + 1}` : 'Output';

                    // Get the actual data - safely access properties
                    const processedData = nodeResult?.processedData || nodeResult?.data || nodeResult;

                    updateNode(outputNode._id, {
                        file: {
                            ...outputData.file,
                            filename: outputData.file?.filename || `${outputName.toLowerCase().replace(/\s+/g, '_')}.json`,
                            content: JSON.stringify(processedData, null, 2),
                            processedData: processedData
                        }
                    });
                });

                console.log("All execution results processed.");
                toast.success("Execution completed successfully! ✅");
            } else {
                const errorMsg = data?.error ||  "Execution failed without a specific error message.";
                console.error("Execution error:", errorMsg);
                toast.error("Execution Error: " + errorMsg);
            }
        } catch (error: any) {
            console.error("Error executing workflow:", error);
            toast.error("Error during execution: " + (error.message || "Unknown error"));
        } finally {
            setIsExecuting(false);
        }
    };

    const generateGraph = async () => {
        const outputNode = workflow.definition.nodes.find(n => n.type === 'output');
        const outputData = outputNode?.data as any;
        const processedData = outputData?.file?.processedData || [];

        if (!processedData || processedData.length === 0) {
            toast.error('No processed data available. Please run the workflow first.');
            return;
        }

        const columns = Object.keys(processedData[0]);
        const numericColumns = columns.filter(col =>
            typeof processedData[0][col] === 'number'
        );

        if (numericColumns.length === 0) {
            toast.error('No numeric columns found for graph generation.');
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
                toast.error('Failed to generate graph: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating graph:', error);
            toast.error('Error generating graph. Please ensure the backend is running.');
        }
    };
    const handleSave = async () => {
        if (!user) {
            toast.error("You must be logged in to save workflows.");
            return;
        }

        if (isSaving) return; // Prevent multiple saves
        setIsSaving(true);
        setSaveStatus('saving');
        
        try {
            // PHASE 5: DATA SAFETY & SANITIZATION
            // Strip out large analytical caches or circular references
            const replacer = (key: string, value: any) => {
                if (key === 'processedData' || key === 'previewData') return undefined;
                if (value === undefined) return undefined;
                return value;
            };

            const cleanNodes = JSON.parse(JSON.stringify(workflow.definition.nodes, replacer));
            
            // Sanitize edges to remove huge analytical payloads
            const cleanEdges = JSON.parse(JSON.stringify(workflow.definition.edges, replacer));

            if (workflowId) {
                // PHASE 1-3: UPDATE EXISTING WITHOUT UI RESET
                await workflowApi.updateWorkflow(workflowId, workflow.name || 'Updated Workflow', cleanNodes, cleanEdges);
                console.log("Workflow saved successfully (Partial Update)!");
            } else {
                const newWf = await workflowApi.createWorkflow(workflow.name, cleanNodes, cleanEdges);
                navigate(`/playground?id=${newWf.id}`, { replace: true });
                console.log("New workflow created and saved!");
            }
            
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
            
        } catch (error: any) {
            console.error("Save error:", error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 4000);
        } finally {
            // PHASE 6: SAVE CONTROL (Debounce release)
            setTimeout(() => {
                setIsSaving(false);
            }, 1000);
        }
    };

    return (
        <>
        <div 
            className={open ? "sidebar" : "sidebar close"}
        >
            <div className="sidebar-btn">
                <button className="toggle-btn" onClick={() => setOpen(!open)}>
                    {open ? "<<" : ">>"}
                </button>
            </div>
            <Link to={user ? "/dashboard" : "/"}>
                <div className="sidebar-logo logo-container">
                    <img src={Logo} alt="" />
                    <span className="sidebar-logo-name">NodeFlow</span>
                </div>
            </Link>

            {/* PHASE 16: Workflow Renaming Area / Mode Indicator */}
            {open && (
                <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid var(--color-border-grey)' }}>
                    <div style={{ position: 'relative' }}>
                        {mode === 'public' ? (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px',
                                background: 'rgba(99, 102, 241, 0.05)',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid rgba(99, 102, 241, 0.1)'
                            }}>
                                <span style={{ 
                                    color: 'var(--color-accent-1)', 
                                    fontWeight: '800', 
                                    fontSize: '0.9rem',
                                    letterSpacing: '0.5px'
                                }}>
                                    PLAYGROUND MODE
                                </span>
                                <button 
                                    onClick={() => navigate('/')}
                                    style={{
                                        background: 'linear-gradient(37deg, var(--color-accent-1), var(--color-accent-2))',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 10px var(--color-accent-1-light)'
                                    }}
                                >
                                    Login to Save
                                </button>
                            </div>
                        ) : (
                            <>
                                {user && workflowId ? (
                                    <>
                                        {isOwner ? (
                                            <input 
                                                value={localName}
                                                onChange={(e) => setLocalName(e.target.value)}
                                                onBlur={() => {
                                                    if (!localName.trim()) setLocalName(workflow.name);
                                                }}
                                                placeholder="Workflow Name"
                                                style={{
                                                    width: '100%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: nameStatus === 'error' ? '1px solid #ef4444' : '1px solid transparent',
                                                    color: 'var(--color-text-dark)',
                                                    fontWeight: '600',
                                                    fontSize: '0.95rem',
                                                    padding: '4px 0',
                                                    outline: 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ 
                                                    color: 'var(--color-text-dark)', 
                                                    fontWeight: '600', 
                                                    fontSize: '0.95rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {workflow.name}
                                                </span>
                                                <span style={{ 
                                                    fontSize: '0.65rem', 
                                                    padding: '1px 6px', 
                                                    background: '#e0e7ff', 
                                                    color: '#4338ca', 
                                                    borderRadius: '10px',
                                                    fontWeight: '700'
                                                }}>
                                                    SHARED
                                                </span>
                                            </div>
                                        )}
                                        {isOwner && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                right: 0, 
                                                top: '50%', 
                                                transform: 'translateY(-50%)',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {nameStatus === 'saving' && <span style={{ color: 'var(--color-text-grey)' }}>Saving...</span>}
                                                {nameStatus === 'saved' && <span style={{ color: '#10b981' }}><FaCheck /> Saved</span>}
                                                {nameStatus === 'error' && <span style={{ color: '#ef4444' }}><FaTimes /> Error</span>}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--color-text-dark)', fontWeight: '600' }}>Untitled Workflow</span>
                                )}
                            </>
                        )}
                    </div>
                    {mode === 'private' && isOwner && nameError && (
                        <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '4px' }}>
                            {nameError}
                        </div>
                    )}
                </div>
            )}

            <div className="sidebar-contents">
                <div className="sidebar-part">
                    <div className="sidebar-part-title">Editor Nodes</div>
                    <ul className="sidebar-part-nodes">
                        <motion.li 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="sidebar-part-node-item"
                        >
                            <button onClick={createNewInputNode}>
                                <span className="icon"><LuFileInput /></span> File Input Node
                            </button>
                        </motion.li>
                        <motion.li 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="sidebar-part-node-item"
                        >
                            <button onClick={createNewTransformNode}>
                                <span className="icon"><IoSettingsOutline /></span> Transformation
                            </button>
                        </motion.li>
                        <motion.li 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="sidebar-part-node-item"
                        >
                            <button onClick={createNewOutputNode}>
                                <span className="icon"><HiLightningBolt /></span> Result
                            </button>
                        </motion.li>
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
                        {mode === 'private' && user && (
                            <li className="management-item">
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    style={{
                                        backgroundColor: saveStatus === 'success' ? 'var(--color-success, #10b981)' : saveStatus === 'error' ? 'var(--color-error, #ef4444)' : '',
                                        color: (saveStatus === 'success' || saveStatus === 'error') ? 'white' : '',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <span className="icon"><MdSave /></span> 
                                    {saveStatus === 'saving' ? 'Saving...' : 
                                     saveStatus === 'success' ? 'Saved ✅' : 
                                     saveStatus === 'error' ? 'Failed ❌' : 
                                     'Save Workflow'}
                                </button>
                            </li>
                        )}

                        <li className="management-item">
                            <button onClick={() => {
                                console.log(workflow)
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
                                // Set first output node as default
                                const availableOutputs = workflow.definition.nodes.filter(n => n.type === 'output');
                                if (availableOutputs.length > 0) {
                                    setSelectedOutputNode(availableOutputs[0]._id);
                                }
                                setShowGraphModal(true);
                            }}>
                                <span className="icon"><MdBarChart /></span> Show Graph
                            </button>
                        </li>

                        {mode === 'private' && user && workflowId && (
                            <li className="management-item">
                                <button onClick={() => setShowShareModal(true)}>
                                    <span className="icon"><FaShareFromSquare /></span> Share 
                                </button>
                            </li>
                        )}
                        {mode === 'private' && (
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
                        )}
                        {mode === 'public' && (
                            <li className="management-item destructive">
                                <button onClick={() => {
                                    if (window.confirm("Reset playground? All unsaved changes will be lost.")) {
                                        window.location.reload();
                                    }
                                }}>
                                    <span className="icon">🔄</span> Reset Playground
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            </div>

        </div>
        
        {/* PHASE 14: Minimal Stacking Fix - Moved outside motion.div */}
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
                            }}>Output Node</label>
                            <select
                                value={selectedOutputNode}
                                onChange={(e) => {
                                    setSelectedOutputNode(e.target.value)
                                    // Update available columns based on selected output
                                    const selectedNode = workflow.definition.nodes.find(n => n._id === e.target.value)
                                    const data = (selectedNode?.data as any)?.file?.processedData || []
                                    if (data.length > 0) {
                                        const cols = Object.keys(data[0] || {})
                                        setAvailableColumns(cols)
                                        if (cols.length > 0) {
                                            setXColumn(cols[0])
                                            if (cols.length > 1) setYColumn(cols[1])
                                        }
                                    }
                                }}
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
                                {workflow.definition.nodes.filter(n => n.type === 'output').map((node, index) => (
                                    <option key={node._id} value={node._id}>
                                        {node.name || `Output ${index + 1}`}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                {availableColumns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={async () => {
                                    const outputNodes = workflow.definition.nodes.filter(n => n.type === 'output');
                                    const outputNode = outputNodes.find(n => n._id === selectedOutputNode) || outputNodes[0];

                                    let processedData = (outputNode?.data as any)?.file?.processedData || [];

                                    console.log('[GRAPH] Raw processedData:', processedData);
                                    console.log('[GRAPH] Type:', typeof processedData, 'Is Array:', Array.isArray(processedData));

                                    // Flatten if data is nested (array of arrays)
                                    if (Array.isArray(processedData) && processedData.length > 0 && Array.isArray(processedData[0])) {
                                        processedData = processedData.flat();
                                        console.log('[GRAPH] Flattened data:', processedData);
                                    }

                                    // If data is an object with data property, extract it
                                    if (!Array.isArray(processedData) && processedData.data && Array.isArray(processedData.data)) {
                                        processedData = processedData.data;
                                        console.log('[GRAPH] Extracted data from object:', processedData);
                                    }

                                    if (!processedData || processedData.length === 0) {
                                        alert('No data available. Please execute the workflow first.');
                                        return;
                                    }

                                    // Check first row structure
                                    console.log('[GRAPH] First row:', processedData[0]);
                                    console.log('[GRAPH] Columns:', Object.keys(processedData[0] || {}));

                                    if (!xColumn) {
                                        alert('Please select an X-axis column.');
                                        return;
                                    }

                                    try {
                                        const result = await workflowExecutionService.generateGraph(
                                            processedData,
                                            graphType,
                                            xColumn,
                                            yColumn || undefined,
                                            `${yColumn || 'Count'} by ${xColumn}`
                                        );

                                        if (result.success && result.graph_url) {
                                            setGraphUrl(result.graph_url);
                                            setShowGraphDisplay(true);
                                            setShowGraphModal(false);
                                        } else {
                                            console.error('[GRAPH] Backend error:', result);
                                            alert('Failed to generate graph: ' + (result.error || JSON.stringify(result) || 'Unknown error'));
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

        {/* Graph Display Section */}
        {showGraphDisplay && graphUrl && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1001
            }}>
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '12px',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        marginBottom: '15px'
                    }}>
                        <h3 style={{ margin: 0, color: '#1f2937' }}>Generated Graph</h3>
                        <button
                            onClick={() => setShowGraphDisplay(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                cursor: 'pointer',
                                color: '#6b7280'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <img
                        src={graphUrl}
                        alt="Generated Graph"
                        style={{
                            maxWidth: '80vw',
                            maxHeight: '70vh',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    />
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = graphUrl;
                                link.download = 'graph.png';
                                link.click();
                            }}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Download
                        </button>
                        <button
                            onClick={() => setShowGraphDisplay(false)}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* PHASE 13: Move ShareModal out of motion.div to fix z-index/transform issues */}
        {showShareModal && workflowId && (
            <ShareModal workflowId={workflowId} onClose={() => setShowShareModal(false)} />
        )}
        </>
    )
}

export default Sidebar
