export type NodeType = 'input' | 'transform' | 'output'

export type FileFormat = 'csv' | 'json' | 'xml' | 'NA'

export enum TransformType {
    FILTER = "FILTER",
    DROP_COLUMN = "DROP_COLUMN",
    RENAME_COLUMN = "RENAME_COLUMN",
    NORMALIZE = "NORMALIZE",
    FILL_NA = "FILL_NA",
    TRIM = "TRIM",
    TO_UPPER = "TO_UPPER",
    TO_LOWER = "TO_LOWER"
}

export interface Position {
    x: number
    y: number
}

export interface IFile {
    filename: string,
    fileContent: string,
    fileFormat: string
}

export interface InputNodeData {
    file: IFile
}

export interface TransformNodeData {
    transformType: TransformType
    columnName: string
    condition?: string // Used for operations like 'filter'
    targetValue?: string // Used for RENAME or FILL_NA
}

export interface OutputNodeData {
    file: IFile
}

// this interface is common for all the nodes
export interface WorkflowNode {
    readonly _id: string
    type: NodeType
    position: Position
    data: InputNodeData | TransformNodeData | OutputNodeData
}

// only to be passed as the argument for FC
export interface NodeProps {
    node: WorkflowNode
}

export interface WorkflowEdge {
    readonly _id: string
    source: WorkflowNode
    target: WorkflowNode
}

export interface WorkflowDefinition {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}

export interface Workflow {
    readonly _id: string
    name: string
    selectedNode?: WorkflowNode | null
    activeSourceNode: WorkflowNode | null
    definition: WorkflowDefinition
}