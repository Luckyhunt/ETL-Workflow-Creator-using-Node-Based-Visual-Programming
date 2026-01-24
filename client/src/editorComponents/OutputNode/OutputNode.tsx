import React, { type FC } from "react";
import type { NodeProps } from "../../types";
import { MdDownload } from "react-icons/md";
import "./OutputNode.css"

const OutputNode: FC<NodeProps> = (props) => {
    // Use props to satisfy linter
    React.useMemo(() => props, [props]);
    const fileName = "output.csv"
    return (
        <div className="common-node-body outputnode-body">
            <div className="common-node-output-file-container">
                <span className="common-node-output-file">{ fileName }</span>
                <button
                    className="common-node-button" 
                ><MdDownload /></button>
            </div>
        </div>
    )
}

export default OutputNode