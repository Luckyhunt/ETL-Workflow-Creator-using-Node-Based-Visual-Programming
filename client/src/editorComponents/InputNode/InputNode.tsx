import React, { type FC, useState, useRef } from "react"
import type { NodeProps } from "../../types"
import "./InputNode.css"

import { MdOutlineFileUpload } from "react-icons/md"
import { ImCross } from "react-icons/im"
import { useWorkflow } from "../../contexts/useWorkflow"

const InputNode: FC<NodeProps> = ({ node }) => {
    
    const { updateNode } = useWorkflow();
    
    // node position state
    // const { updateNodePosition } = useWorkflow()
    // const [position, setPosition] = useState<Position>(node.position)
    // const [isDragging, setIsDragging] = useState(false)
    // const dragOffset = useRef({ x: 0, y: 0 })


    // node file state
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [ file, setFile ] = useState<File | null>(null)

    // useEffect(() => {
    //     setPosition(node.position)
    // }, [node.position])

    // const handleMouseDown = (e: React.MouseEvent) => {
    //     e.stopPropagation()
    //     setIsDragging(true)
    //     dragOffset.current = {
    //         x: e.clientX - position.x,
    //         y: e.clientY - position.y
    //     }
    // }

    const handleDeleteFile = (e: React.MouseEvent) => {
        e.stopPropagation()
        setFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
        
        // Reset the node's file data
        updateNode(node._id, {
            file: {
                filename: "",
                fileContent: "",
                fileFormat: 'NA'
            }
        });
    }

    // useEffect(() => {
    //     const handleMouseMove = (e: MouseEvent) => {
    //         if (isDragging) {
    //             setPosition({
    //                 x: e.clientX - dragOffset.current.x,
    //                 y: e.clientY - dragOffset.current.y
    //             })
    //         }
    //     }

    //     const handleMouseUp = () => {
    //         if (isDragging) {
    //             setIsDragging(false)
    //             updateNodePosition(node._id, position)
    //         }
    //     }

    //     if (isDragging) {
    //         window.addEventListener('mousemove', handleMouseMove)
    //         window.addEventListener('mouseup', handleMouseUp)
    //     }

    //     return () => {
    //         window.removeEventListener('mousemove', handleMouseMove)
    //         window.removeEventListener('mouseup', handleMouseUp)
    //     }
    // }, [isDragging, node._id, position, updateNodePosition])

    // const style: CSSProperties = {
    //     left: position.x,
    //     top: position.y,
    //     cursor: isDragging ? 'grabbing' : 'grab',
    // }

    return (
        // <div
        //     className="common-node inputnode"
        //     style={style}
        //     onMouseDown={handleMouseDown}
        // >
        <div className="common-node-body inputnode-body">
            {
                file ? 
                <div className="inputnode-file-details">
                    <span className="inputnode-file-name">{file.name}</span>
                    <button
                        className="common-node-button"
                        onClick={handleDeleteFile}
                    ><ImCross /></button>
                </div> :
            
                <div className="common-node-upload">
                    <input
                        ref={fileInputRef}
                        type="file"
                        name={`file-input-${node._id}`}
                        id={`file-input-${node._id}`}
                        className="common-node-file-input"
                        onChange={async (e) => {
                            const selectedFile = e.target.files ? e.target.files[0] : null;
                            if (selectedFile) {
                                setFile(selectedFile);
                                
                                // Read file content
                                const fileContent = await selectedFile.text();
                                
                                // Update the node's data with file information
                                updateNode(node._id, {
                                    file: {
                                        filename: selectedFile.name,
                                        fileContent: fileContent,
                                        fileFormat: selectedFile.name.split('.').pop()?.toLowerCase() || 'NA'
                                    }
                                });
                            }
                        }}
                    />
                    <div
                        className="inputnode-file-info"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="common-node-icon"><MdOutlineFileUpload /></span>
                        <span className="inputnode-upload-text">No file uploaded</span>
                    </div>
                </div>
            }
            {/* <select className="common-node-select" defaultValue="file format">
                <option value="">file format</option>
                <option value="csv">csv</option>
                <option value="json">json</option>
                <option value="xml">xml</option>
            </select> */}
        </div>
    )

}

export default InputNode