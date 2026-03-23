import { useState, useRef, useEffect, type CSSProperties, type FC } from "react"
import type { Position, NodeProps } from "../../types";
import { useWorkflow } from "../../contexts/useWorkflow";
import { useResponsive } from "../../hooks/useResponsive";
import InputNode from "../InputNode/InputNode";
import TransformNode from "../TransformNode/TransformNode";
import "./CommonNode.css"
import { MdDeleteOutline } from "react-icons/md";
import OutputNode from "../OutputNode/OutputNode";
import { v4 as uuidv4 } from "uuid";


const CommonNode: FC<NodeProps> = ({ node }) => {

    const { workflow, setActiveSourceNode, removeNode, updateNodePosition, addEdge, removeEdge, setSelectedNode } = useWorkflow()
    const { isMobile } = useResponsive()
    const [position, setPosition] = useState<Position>(node.position)
    const [isDragging, setIsDragging] = useState<boolean>(false)
    const dragOffset = useRef({ x: 0, y: 0 })

    const availableTargets = workflow.definition.nodes.filter(
        n => n._id !== node._id && n.type !== 'input'
    );
    const existingEdges = workflow.definition.edges.filter(e => e.source._id === node._id);
    const connectedTargetIds = existingEdges.map(e => typeof e.target === 'string' ? e.target : e.target._id);

    const handleMobileConnect = (targetId: string) => {
        if (!targetId) return;
        const targetNode = workflow.definition.nodes.find(n => n._id === targetId);
        if (!targetNode) return;
        
        addEdge({
            _id: uuidv4(),
            source: node,
            target: targetNode
        });
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDragging(true)
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation()
        setIsDragging(true)
        const touch = e.touches[0]
        dragOffset.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        }
    }

    const handlePortMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        setActiveSourceNode(node)
    }

    const handlePortTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation()
        setActiveSourceNode(node)
    }

    const handlePortMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (workflow.activeSourceNode) {
            // Validate connection: prevent invalid flows
            // Don't allow output -> anything (output should be end point)
            if (workflow.activeSourceNode.type === 'output') {
                console.log('Cannot connect from output node');
                return;
            }
            
            // Don't allow connections TO an input node
            if (node.type === 'input') {
                console.log('Cannot connect to an input node');
                return;
            }
            
            // Don't allow a node to connect to itself
            if (workflow.activeSourceNode._id === node._id) {
                console.log('Cannot connect node to itself');
                return;
            }
            
            // Create the edge
            addEdge({
                _id: uuidv4(),
                source: workflow.activeSourceNode,
                target: node
            })
        }
        setActiveSourceNode(null)
    }

    const handlePortTouchEnd = (e: React.TouchEvent) => {
        // Touch events are trickier because the touchend target is where the touch started.
        // For a simple implementation, we assume if activeSourceNode is set and touch ends here,
        // it was a tap-to-connect or a drag that resolved over this port.
        // A robust solution uses document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        // For now, we reuse the mouseUp logic.
        handlePortMouseUp(e as any)
    }

    const handleNodeSelection = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedNode(node)
    }

    const handleNodeMouseUp = (e: React.MouseEvent) => {
        if (workflow.activeSourceNode && workflow.activeSourceNode._id !== node._id) {
            handlePortMouseUp(e);
        }
    }
    
    const handleNodeTouchEnd = (e: React.TouchEvent) => {
        if (workflow.activeSourceNode && workflow.activeSourceNode._id !== node._id) {
            handlePortTouchEnd(e);
        }
        handleNodeSelection(e);
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

        const handleTouchMove = (e: TouchEvent) => {
            // Prevent scrolling while dragging a node
            if (isDragging) {
                e.preventDefault() 
                const touch = e.touches[0]
                const newPosition = {
                    x: touch.clientX - dragOffset.current.x,
                    y: touch.clientY - dragOffset.current.y
                }
                setPosition(newPosition)
                updateNodePosition(node._id, newPosition)
            }
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            window.addEventListener('touchmove', handleTouchMove, { passive: false })
            window.addEventListener('touchend', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('touchend', handleMouseUp)
        }
    }, [workflow, isDragging, node._id, updateNodePosition])

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
            className={`common-node ${workflow.selectedNode?._id === node._id ? "selected" : ""}`}
            style={style}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleNodeSelection}
            onMouseUp={handleNodeMouseUp}
            onTouchEnd={handleNodeTouchEnd}
        >
            {/* Node ports */}
            {/* Input ports - allow receiving connections (left side) */}
            {node.type !== 'input' && (
                <div
                    className="common-node-port input-port"
                    onMouseUp={handlePortMouseUp}
                    onTouchEnd={handlePortTouchEnd}
                ></div>
            )}
            {/* Output ports - allow sending connections (right side) */}
            {node.type !== 'output' && (
                <div
                    className="common-node-port output-port"
                    onMouseDown={handlePortMouseDown}
                    onTouchStart={handlePortTouchStart}
                ></div>
            )}

            <div className="common-node-header">
                <span className="common-node-title">{node.name || node.type}</span>
                <button
                    onClick={() => removeNode(node._id)}
                    className="common-node-delete"
                >
                    <MdDeleteOutline />
                </button>
            </div>
            {displayNode()}
            
            {isMobile && node.type !== 'output' && (
                <div style={{ padding: '0 20px 20px 20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '0 0 9px 9px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        Quick Connect
                    </div>
                    {/* Display existing outgoing connections with a delete button */}
                    {existingEdges.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {existingEdges.map(edge => {
                                const targetId = typeof edge.target === 'string' ? edge.target : edge.target._id;
                                const targetNode = workflow.definition.nodes.find(n => n._id === targetId);
                                return (
                                    <div key={edge._id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#fff' }}>
                                        <span style={{ marginRight: '6px' }}>&rarr; {targetNode?.name || targetNode?.type || 'Unknown'}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeEdge(edge._id); }}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <select 
                        className="common-node-select"
                        style={{ width: '100%', margin: 0, height: '36px', fontSize: '0.85rem' }}
                        value=""
                        onChange={(e) => handleMobileConnect(e.target.value)}
                    >
                        <option value="" disabled>Select target node...</option>
                        {availableTargets.map(target => {
                            const isConnected = connectedTargetIds.includes(target._id);
                            return (
                                <option key={target._id} value={target._id} disabled={isConnected}>
                                    {target.name || target.type} {isConnected ? '(Connected)' : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}
        </div>
    )
}

export default CommonNode