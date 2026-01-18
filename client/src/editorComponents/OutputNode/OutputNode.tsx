import type { FC } from "react";
import type { NodeProps } from "../../types";

const OutputNode: FC<NodeProps> = ({ node }) => {
    return (
        <>
            this is output node:  {node._id} 
        </>
    )
}

export default OutputNode