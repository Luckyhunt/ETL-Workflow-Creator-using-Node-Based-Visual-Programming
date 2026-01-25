import { useState, useRef, useEffect } from "react"
import { useWorkflow } from "../../contexts/useWorkflow"
import "./Previewer.css"

const Previewer = () => {
    const [open, setOpen] = useState(true)
    const [width, setWidth] = useState(250) // default width
    const isResizing = useRef(false)
    
    const { workflow } = useWorkflow()
    
    const renderTableFromCSV = (csvContent: string) => {
        if (!csvContent) return <div>No content available</div>;
        
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return <div>No data</div>;
        
        const headers = lines[0].split(',').map(header => header.trim());
        const rows = lines.slice(1).map(line => line.split(','));
        
        return (
            <table className="previewer-data-table">
                <thead>
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell.trim()}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current) return
            const newWidth = window.innerWidth - e.clientX
            if (newWidth > 120 && newWidth < 600) {   // min/max width
                setWidth(newWidth)
            }
        }

        const handleMouseUp = () => {
            isResizing.current = false
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [])

    return (
        <div 
            className={open ? "previewer" : "previewer close"}
            style={{ width: open ? `${width}px` : "0px" }}
        >
            {/* Resize Handle */}
            {open && (
                <div
                    className="previewer-resizer"
                    onMouseDown={() => (isResizing.current = true)}
                />
            )}

            <div className="previewer-btn">
                <button
                    className="toggle-btn"
                    onClick={() => setOpen(!open)} 
                >
                    { open ? ">>" : "<<"}
                </button>
            </div>

            <div className="previewer-title">Previewer</div>

            <div className="previewer-body">
                {workflow.selectedNode ? (
                    <div className="previewer-node-details">
                        <h3 className="previewer-node-title">Node Details</h3>
                        <div className="previewer-node-property">
                            <strong>ID:</strong> <span>{workflow.selectedNode._id}</span>
                        </div>
                        <div className="previewer-node-property">
                            <strong>Type:</strong> <span className="previewer-node-type">{workflow.selectedNode.type}</span>
                        </div>
                        <div className="previewer-node-property">
                            <strong>Position:</strong> <span>({workflow.selectedNode.position.x}, {workflow.selectedNode.position.y})</span>
                        </div>
                        <div className="previewer-node-data">
                            <strong>Data:</strong>
                            {workflow.selectedNode.type === 'input' && (workflow.selectedNode.data as any).file ? (
                                <div className="previewer-file-info">
                                    <div className="previewer-file-property">
                                        <strong>File Name:</strong> <span>{(workflow.selectedNode.data as any).file.filename || 'N/A'}</span>
                                    </div>
                                    <div className="previewer-file-property">
                                        <strong>File Type:</strong> <span>{(workflow.selectedNode.data as any).file.fileFormat || 'N/A'}</span>
                                    </div>
                                    <div className="previewer-file-content">
                                        <strong>File Content:</strong>
                                        <div className="previewer-table-container">
                                            {renderTableFromCSV((workflow.selectedNode.data as any).file?.fileContent || '')}
                                        </div>
                                    </div>
                                </div>
                            ) : workflow.selectedNode.type === 'output' && (workflow.selectedNode.data as any).file ? (
                                <div className="previewer-file-info">
                                    <div className="previewer-file-property">
                                        <strong>File Name:</strong> <span>{(workflow.selectedNode.data as any).file.filename || 'output.csv'}</span>
                                    </div>
                                    <div className="previewer-file-property">
                                        <strong>File Type:</strong> <span>{(workflow.selectedNode.data as any).file.fileFormat || 'csv'}</span>
                                    </div>
                                    <div className="previewer-file-content">
                                        <strong>File Content:</strong>
                                        <div className="previewer-table-container">
                                            {renderTableFromCSV((workflow.selectedNode.data as any).file?.content || (workflow.selectedNode.data as any).file?.fileContent || '')}
                                        </div>
                                    </div>
                                </div>
                            ) : workflow.selectedNode.type === 'transform' ? (
                                <div className="previewer-transform-info">
                                    <div className="previewer-file-property">
                                        <strong>Transform Type:</strong> <span>{(workflow.selectedNode.data as any).transformType || 'N/A'}</span>
                                    </div>
                                    <div className="previewer-file-property">
                                        <strong>Column Name:</strong> <span>{(workflow.selectedNode.data as any).columnName || 'N/A'}</span>
                                    </div>
                                    {(workflow.selectedNode.data as any).condition && (
                                        <div className="previewer-file-property">
                                            <strong>Condition:</strong> <span>{(workflow.selectedNode.data as any).condition}</span>
                                        </div>
                                    )}
                                    {(workflow.selectedNode.data as any).targetValue && (
                                        <div className="previewer-file-property">
                                            <strong>Target Value:</strong> <span>{(workflow.selectedNode.data as any).targetValue}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <pre className="previewer-data-content">{JSON.stringify(workflow.selectedNode.data, null, 2)}</pre>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="previewer-guide">Select a Node to preview</p>
                )}
            </div>
        </div>
    )
}

export default Previewer
