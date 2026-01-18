import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { Link } from "react-router"
import type { Workflow, WorkflowNode } from "../../types"
import { useWorkflow } from "../../contexts/WorkflowContext"
import Logo from "../../images/logo.svg"
import "./Sidebar.css"
import { LuFileInput } from "react-icons/lu"
import { IoSettingsOutline } from "react-icons/io5"
import { HiLightningBolt } from "react-icons/hi";

const Sidebar = () => {

    const [open, setOpen] = useState<boolean>(true)
    const { addNode } = useWorkflow()

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
                transformType: 'NA',
                column: 'NA',
                condition: 'NA'
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
                    <span className="navbar-logo-name">NodeFlow</span> <br />
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
                                <span className="icon"><IoSettingsOutline /></span> Normalization
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
            </div>
        </div>
    )
}

export default Sidebar