import type { FC } from "react";
import type { NodeProps } from "../../types";

const TransformNode: FC<NodeProps> = ({ node }) => {
    return (
        <>
            this is transform node { node._id }
        </>
    )
}

export default TransformNode