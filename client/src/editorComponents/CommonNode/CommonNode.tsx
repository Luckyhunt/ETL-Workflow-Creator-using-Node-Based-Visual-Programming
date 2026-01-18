import { useState, useRef, useEffect, type CSSProperties, type FC } from "react"
import type { Position, NodeProps } from "../../types";
import { useWorkflow } from "../../contexts/WorkflowContext";
import InputNode from "../InputNode/InputNode";
import TransformNode from "../TransformNode/TransformNode";
import "./CommonNode.css"
import { MdDeleteOutline } from "react-icons/md";
import OutputNode from "../OutputNode/OutputNode";
import { v4 as uuidv4 } from "uuid";


const CommonNode: FC<NodeProps> = ({ node }) => {

    // node position state
    const { workflow, setActiveSourceNode, removeNode, updateNodePosition, addEdge } = useWorkflow()
    const [position, setPosition] = useState<Position>(node.position)
    const [isDragging, setIsDragging] = useState<boolean>(false)
    const dragOffset = useRef({ x: 0, y: 0 })

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDragging(true)
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        }
    }

    const handlePortMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setActiveSourceNode(node)
        console.log("Mouse pressed on output node: ", node.type)
    }

    const handlePortMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (workflow.activeSourceNode) {
            addEdge({
                _id: uuidv4(),
                source: workflow.activeSourceNode,
                target: node
            })
            console.log("Mouse lifted on input node of another node: ", node.type)
        }
        setActiveSourceNode(null)
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newPosition = {
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                }
                setPosition(newPosition)
                updateNodePosition(node._id, newPosition)
            }
        }

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false)
            }
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, node._id, updateNodePosition])

    const displayNode = () => {
        switch (node.type) {
            case 'input':
                return <InputNode node={node} />
            case 'transform':
                return <TransformNode node={node} />
            case 'output':
                return <OutputNode node={node} />
            default:
                return null
        }
    }

    const style: CSSProperties = {
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab'
    }

    return (
        <div
            className="common-node"
            style={style}
            onMouseDown={handleMouseDown}
        >
            {/* Node ports */}
            {node.type !== 'input' && (
                <div
                    className="common-node-port input-port"
                    onMouseUp={handlePortMouseUp}
                ></div>
            )}
            {node.type !== 'output' && (
                <div
                    className="common-node-port output-port"
                    onMouseDown={handlePortMouseDown}
                ></div>
            )}

            <div className="common-node-header">
                <span className="common-node-title">{node.type}</span>
                <button
                    onClick={() => removeNode(node._id)}
                    className="common-node-delete"
                >
                    <MdDeleteOutline />
                </button>
            </div>
            {displayNode()}
        </div>
    )
}

export default CommonNode