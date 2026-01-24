import React, { type FC } from "react";
import { TransformType, type NodeProps } from "../../types";

const TransformNode: FC<NodeProps> = (props: NodeProps) => {
    // Use props to satisfy linter
    React.useMemo(() => props, [props]);


    const transformations = Object.values(TransformType).map(type => type)

    return (
        <div className="common-node-body transformnode-body">
            <div className="common-node-select-container">
                <label htmlFor="transform" className="common-node-label">Select Transformation</label>
                <select
                    name="transform"
                    className="common-node-select"
                    defaultValue="transform" 
                >
                    {
                        transformations.map(type => <option key={type} value={type}>{ type }</option>)
                    }
                </select>
            </div>
            <div className="common-node-input-container">
                <label htmlFor="column" className="common-node-label">Column Name</label>
                <input
                    className="common-node-input"
                    type="text"
                    name="column"
                    placeholder="Eg. `salary`"
                />
            </div>
            <div className="common-node-input-container">
                <label htmlFor="condition" className="common-node-label">Condition</label>
                <input
                    className="common-node-input"
                    type="text"
                    name="condition"
                    placeholder="Eg. age >= 20"
                />
            </div>
        </div>
    )
}

export default TransformNode