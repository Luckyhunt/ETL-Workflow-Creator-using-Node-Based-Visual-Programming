import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { Link } from "react-router"
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
    const { workflow, addNode, deleteDraft, shareWorkflow } = useWorkflow()

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
        const newOutputNode: WorkflowNode = {
            _id: uuidv4(),
            type: 'output',
            position: {x: 600, y: 200},
            data: {
                file: {
                    filename: 'NA',
                    fileContent: 'NA',
                    fileFormat: 'NA'
                }
            }
        }
        addNode(newOutputNode)
    }

    const executeWorkflow = async () => {
        try {
            const result = await workflowExecutionService.executeWorkflow(workflow);
            
            if (result.success) {
                alert(`Workflow executed successfully!\nFinal data: ${JSON.stringify(result.data, null, 2)}`);
                console.log("Execution result:", result);
            } else {
                alert(`Workflow execution failed:\n${result.error}`);
                console.error("Execution error:", result.error);
            }
        } catch (error) {
            console.error("Error executing workflow:", error);
            alert(`Error executing workflow: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <div className={open ? "sidebar" : "sidebar close"}>
            <div className="sidebar-btn">
                <button
                    className="toggle-btn"
                    onClick={() => setOpen(!open)}
                >
                    {
                        open ? "<<" : ">>"
                    }
                </button>
            </div>
            <Link to="/">
                <div className="sidebar-logo logo-container">
                    <img src={Logo} alt="" />
                    <span className="sidebar-logo-name">NodeFlow</span> <br />
                </div>
            </Link>
            <div className="sidebar-contents">
                <div className="sidebar-part">
                    <div className="sidebar-part-title">
                        Editor Nodes
                    </div>
                    <ul className="sidebar-part-nodes">
                        <li className="sidebar-part-node-item">
                            <button
                                onClick={createNewInputNode} 
                            >
                                <span className="icon"><LuFileInput /></span> File Input Node
                            </button>
                        </li>
                        <li className="sidebar-part-node-item">
                            <button
                                onClick={createNewTransformNode} 
                            >
                                <span className="icon"><IoSettingsOutline /></span> Transformation
                            </button>
                        </li>
                        <li className="sidebar-part-node-item">
                            <button
                                onClick={createNewOutputNode}
                            >
                                <span className="icon"><HiLightningBolt /></span> Result
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-part">
                    <div className="sidebar-part-title">
                        MANAGEMENT
                    </div>
                    <div className="management-primary-action">
                        <button
                            className="execute-workflow-btn"
                            onClick={executeWorkflow}
                        >
                            Run Workflow
                        </button>
                    </div>
                    <ul className="management-secondary-actions">
                        <li className="management-item">
                            <button>
                                <span className="icon"><MdSave /></span> Save Workflow
                            </button>
                        </li>
                        <li className="management-item">
                            <button
                                onClick={async () => {
                                    try {
                                        const shareUrl = await shareWorkflow();
                                        
                                        // Copy to clipboard
                                        await navigator.clipboard.writeText(shareUrl);
                                        
                                        // Show success notification
                                        alert(`Workflow shared successfully!\nLink copied to clipboard:\n${shareUrl}`);
                                    } catch (error) {
                                        console.error('Error sharing workflow:', error);
                                        alert('Failed to share workflow. Please try again.');
                                    }
                                }}
                            >
                                <span className="icon"><FaShareFromSquare /></span> Share
                            </button>
                        </li>
                        <li className="management-item disabled">
                            <button
                                onClick={() => {console.dir(workflow)}} 
                            >
                                <span className="icon"><MdBarChart /></span> Show graph
                            </button>
                        </li>
                        <li className="management-item destructive">
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this draft? This action cannot be undone.")) {
                                        deleteDraft();
                                    }
                                }}
                            >
                                <span className="icon">🗑️</span> Delete Draft
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Sidebar