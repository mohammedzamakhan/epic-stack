import { type EdgeTypes } from '@xyflow/react'
import { WorkflowEdge } from './workflow-edge.tsx'

export { WorkflowEdge }

export const edgeTypes: EdgeTypes = {
	workflow: WorkflowEdge,
	default: WorkflowEdge,
}
