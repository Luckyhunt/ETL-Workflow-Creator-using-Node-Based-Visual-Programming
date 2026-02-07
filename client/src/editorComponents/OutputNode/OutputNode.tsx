import React, { type FC } from "react";
import type { NodeProps } from "../../types";
import { MdDownload } from "react-icons/md";
import { useWorkflow } from "../../contexts/useWorkflow";
import "./OutputNode.css"

const OutputNode: FC<NodeProps> = ({ node }) => {
    // Use props to satisfy linter
    React.useMemo(() => node, [node]);
    
    const { updateNode } = useWorkflow();
    
    // Type guard to ensure we're accessing file property safely
    const outputData = node.data as any; // Since we know this is an output node
    const fileName = outputData.file?.filename || "output.csv";
    const processedData = outputData.file?.processedData || [];
    const content = outputData.file?.content || "";
    
    return (
        <div className="common-node-body outputnode-body">
            <div className="common-node-output-file-container">
                <span className="common-node-output-file">{ fileName }</span>
                <button
                    className="common-node-button" 
                    onClick={() => {
                        // Download the processed file
                        if (content || processedData.length > 0) {
                            const dataToDownload = content || JSON.stringify(processedData, null, 2);
                            const blob = new Blob([dataToDownload], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName.replace('.csv', '.json');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    }}
                    disabled={!content && processedData.length === 0}
                ><MdDownload /></button>
            </div>
        </div>
    )
}

export default OutputNode