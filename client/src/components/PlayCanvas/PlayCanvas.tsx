import { useState } from "react"
import "./PlayCanvas.css"
import { useWorkflow } from "../../contexts/useWorkflow"
import CommonNode from "../../editorComponents/CommonNode/CommonNode"
import Edge from "../../editorComponents/Edge/Edge"

const PlayCanvas = ({ canEdit = true }: { canEdit?: boolean }) => {

    const [isGrabbing, setGrabbing] = useState<boolean>(false)
    const { workflow, setActiveSourceNode, setSelectedNode } = useWorkflow()

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseDown = () => {
        setGrabbing(true)
    }

    const handleTouchStart = () => {
        setGrabbing(true)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {

        if (workflow.activeSourceNode) {
            setMousePos({ x: e.clientX, y: e.clientY })
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
            setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
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

    const handleMouseUp = () => {
        setGrabbing(false)

        if (workflow.activeSourceNode) {
            setActiveSourceNode(null)
        }
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        setGrabbing(false)
        const board = e.currentTarget as HTMLDivElement;
        // Reset the tracking coords
        ;(board as any).lastTouchX = undefined;
        ;(board as any).lastTouchY = undefined;

        if (workflow.activeSourceNode) {
            setActiveSourceNode(null)
        }
    }

    const sourceX = workflow.activeSourceNode ? workflow.activeSourceNode.position.x + 300 : 0
    const sourceY = workflow.activeSourceNode ? workflow.activeSourceNode.position.y + 25 : 0
    const curvature = 75
    const pathData = `M ${sourceX} ${sourceY} C ${sourceX + curvature} ${sourceY}, ${mousePos.x - curvature} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`

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
                            // <line
                            //     x1={workflow.activeSourceNode.position.x + 300}
                            //     y1={workflow.activeSourceNode.position.y + 20}
                            //     x2={mousePos.x}
                            //     y2={mousePos.y}
                            //     stroke="#ccc"
                            //     strokeDasharray="5,5"
                            // />
                            <path
                                d={pathData}
                                fill="none"
                                stroke="black"
                                strokeDasharray="5,5"
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