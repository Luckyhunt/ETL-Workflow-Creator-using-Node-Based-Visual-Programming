import { useState } from "react"
import "./PlayCanvas.css"
import { useWorkflow } from "../../contexts/useWorkflow"
import CommonNode from "../../editorComponents/CommonNode/CommonNode"
import Edge from "../../editorComponents/Edge/Edge"
import { v4 as uuidv4 } from "uuid";

const PlayCanvas = ({ canEdit = true }: { canEdit?: boolean }) => {

    const [isGrabbing, setGrabbing] = useState<boolean>(false)
    const { workflow, setActiveSourceNode, setSelectedNode, addEdge } = useWorkflow()

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [snapTargetId, setSnapTargetId] = useState<string | null>(null);

    const handleMouseDown = () => {
        setGrabbing(true)
    }

    const handleTouchStart = () => {
        setGrabbing(true)
    }

    const processProximitySnap = (canvasX: number, canvasY: number) => {
        if (!workflow.activeSourceNode) return;
        let nearestDist = 50; // Snap radius in px
        let nearestId = null;

        for (const node of workflow.definition.nodes) {
            if (node._id === workflow.activeSourceNode._id) continue;
            if (node.type === 'input') continue; // target can't be input

            // Absolute coordinate of the target's input port
            const portX = node.position.x;
            const portY = node.position.y + 25;

            const dist = Math.hypot(canvasX - portX, canvasY - portY);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestId = node._id;
            }
        }
        setSnapTargetId(nearestId);
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {

        if (workflow.activeSourceNode) {
            const board = e.currentTarget;
            const canvasX = e.clientX - board.offsetLeft;
            const canvasY = e.clientY - board.offsetTop;
            setMousePos({ x: canvasX, y: canvasY })
            processProximitySnap(canvasX, canvasY);
            return
        }

        if (isGrabbing) {
            const board = e.currentTarget as HTMLDivElement
            const docWidth = document.documentElement.clientWidth
            const docHeight = document.documentElement.clientHeight

            // A very complicated logic to prevent the board from being dragged out of the viewport
            if (board.offsetLeft <= 0) {
                board.style.left = `${e.movementX + board.offsetLeft}px`
            }
            else {
                board.style.left = "0px"
            }

            if (board.offsetLeft >= docWidth - 2000) {
                board.style.left = `${e.movementX + board.offsetLeft}px`
            }
            else {
                board.style.left = `${docWidth - 2000}px`
            }


            if (board.offsetTop <= 0) {
                board.style.top = `${e.movementY + board.offsetTop}px`
            }
            else {
                board.style.top = "0px"
            }

            if (board.offsetTop > docHeight - 2000) {
                board.style.top = `${e.movementY + board.offsetTop}px`
            }
            else {
                board.style.top = `${docHeight - 2000}px`
            }
        }


    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (workflow.activeSourceNode) {
            const board = e.currentTarget;
            const canvasX = e.touches[0].clientX - board.offsetLeft;
            const canvasY = e.touches[0].clientY - board.offsetTop;
            setMousePos({ x: canvasX, y: canvasY })
            processProximitySnap(canvasX, canvasY);
            return
        }

        if (isGrabbing) {
            const board = e.currentTarget as HTMLDivElement
            const docWidth = document.documentElement.clientWidth
            const docHeight = document.documentElement.clientHeight
            
            // Calculate movement from previous position or use a simpler drag approach
            // For robust touch dragging, keeping track of lastTouch is better, but
            // for now sticking to the existing logic structure adapted for touch.
            // Using a simple workaround for the lack of movementX/Y on touches:
            const movementX = e.touches[0].clientX - (board as any).lastTouchX || 0;
            const movementY = e.touches[0].clientY - (board as any).lastTouchY || 0;
            
            ;(board as any).lastTouchX = e.touches[0].clientX;
            ;(board as any).lastTouchY = e.touches[0].clientY;

            if (board.offsetLeft <= 0) {
                board.style.left = `${movementX + board.offsetLeft}px`
            } else {
                board.style.left = "0px"
            }

            if (board.offsetLeft >= docWidth - 2000) {
                board.style.left = `${movementX + board.offsetLeft}px`
            } else {
                board.style.left = `${docWidth - 2000}px`
            }

            if (board.offsetTop <= 0) {
                board.style.top = `${movementY + board.offsetTop}px`
            } else {
                board.style.top = "0px"
            }

            if (board.offsetTop > docHeight - 2000) {
                board.style.top = `${movementY + board.offsetTop}px`
            } else {
                board.style.top = `${docHeight - 2000}px`
            }
        }
    }

    const finalizeConnection = () => {
        if (workflow.activeSourceNode && snapTargetId) {
            const targetNode = workflow.definition.nodes.find(n => n._id === snapTargetId);
            const sourceNode = workflow.activeSourceNode;
            if (targetNode && sourceNode.type !== 'output') {
                const alreadyConnected = workflow.definition.edges.some(edge => 
                    (typeof edge.source === 'string' ? edge.source : edge.source._id) === sourceNode._id && 
                    (typeof edge.target === 'string' ? edge.target : edge.target._id) === targetNode._id
                );
                if (!alreadyConnected) {
                    addEdge({
                        _id: uuidv4(),
                        source: sourceNode,
                        target: targetNode
                    });
                }
            }
        }
        setActiveSourceNode(null);
        setSnapTargetId(null);
    }

    const handleMouseUp = () => {
        setGrabbing(false)

        if (workflow.activeSourceNode) {
            finalizeConnection();
        }
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        setGrabbing(false)
        const board = e.currentTarget as HTMLDivElement;
        // Reset the tracking coords
        ;(board as any).lastTouchX = undefined;
        ;(board as any).lastTouchY = undefined;

        if (workflow.activeSourceNode) {
             finalizeConnection();
        }
    }

    const sourceX = workflow.activeSourceNode ? workflow.activeSourceNode.position.x + 300 : 0
    const sourceY = workflow.activeSourceNode ? workflow.activeSourceNode.position.y + 25 : 0
    const curvature = 75
    
    // Snapping logic for path rendering
    const snappedNode = snapTargetId ? workflow.definition.nodes.find(n => n._id === snapTargetId) : null;
    
    // Adding 25y for the visual input port level mapping
    const finalX = snappedNode ? snappedNode.position.x : mousePos.x;
    const finalY = snappedNode ? snappedNode.position.y + 25 : mousePos.y;

    const pathData = `M ${sourceX} ${sourceY} C ${sourceX + curvature} ${sourceY}, ${finalX - curvature} ${finalY}, ${finalX} ${finalY}`

    return (
        <div
            className="playcanvas-container"
            onClick={() => setSelectedNode(null)}
        >
            <div
                className={isGrabbing ? "playcanvas grabbing" : "playcanvas"}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <svg className="playcanvas-svg-layer" width="2000" height="2000">
                    {
                        workflow.definition.edges.map((edge) => {
                            const sourceNode = workflow.definition.nodes.find((node) => node._id === edge.source._id)
                            const targetNode = workflow.definition.nodes.find((node) => node._id === edge.target._id)

                            if (!sourceNode || !targetNode) return null

                            return (
                                <Edge
                                    key={edge._id}
                                    source={sourceNode}
                                    target={targetNode}
                                />
                            )
                        })
                    }

                    {
                        // Render active node
                        workflow.activeSourceNode && (
                            <path
                                d={pathData}
                                fill="none"
                                stroke={snapTargetId ? "var(--color-accent-1)" : "var(--color-border-grey)"}
                                strokeWidth={snapTargetId ? "3" : "2"}
                                strokeDasharray={snapTargetId ? "none" : "5,5"}
                                style={{
                                    filter: snapTargetId ? 'drop-shadow(0 0 8px var(--color-accent-1))' : 'none',
                                    transition: 'stroke 0.2s, strokeWidth 0.2s, filter 0.2s'
                                }}
                            />
                        )
                    }
                </svg>

                {
                    workflow.definition.nodes.map((node) => <CommonNode key={node._id} node={{ ...node }} />)
                }
            </div>
        </div>
    )
}

export default PlayCanvas