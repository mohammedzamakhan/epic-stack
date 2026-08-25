import {
	validateWorkflowDAG as validateTenantWorkflowDAG,
	type DAGValidationResult,
	type WorkflowGraph,
} from '@repo/tenant-db/types/journey'
import { type Node, type Edge } from '@xyflow/react'
import { reactFlowToWorkflowGraph } from './serialization.ts'

export interface RealtimeValidationState extends DAGValidationResult {
	nodeErrors: Record<string, string[]>
}

/**
 * Validates the current React Flow canvas state against the DAG rules and schema.
 */
export function validateFlowCanvas(
	nodes: Node[],
	edges: Edge[],
): RealtimeValidationState {
	const nodeErrors: Record<string, string[]> = {}

	if (!nodes || nodes.length === 0) {
		return {
			valid: false,
			errors: ['Workflow must contain at least one Trigger node.'],
			warnings: [],
			nodeCount: 0,
			edgeCount: 0,
			terminalNodeIds: [],
			hasCycles: false,
			nodeErrors,
		}
	}

	// 1. Convert to canonical format for schema & DAG validation
	let graph: WorkflowGraph
	try {
		graph = reactFlowToWorkflowGraph(nodes, edges)
	} catch (err) {
		return {
			valid: false,
			errors: [
				err instanceof Error
					? err.message
					: 'Failed to format graph for validation',
			],
			warnings: [],
			nodeCount: nodes.length,
			edgeCount: edges.length,
			terminalNodeIds: [],
			hasCycles: false,
			nodeErrors,
		}
	}

	// 2. Perform deep DAG validation using @repo/tenant-db
	const dagResult = validateTenantWorkflowDAG(graph)

	// 3. Map errors to specific nodes for inline UI display
	for (const node of nodes) {
		const errs: string[] = []
		const data = (node.data || {}) as Record<string, any>

		switch (node.type) {
			case 'trigger':
				if (!data.triggerType) {
					errs.push('Trigger event type is required.')
				}
				break
			case 'delay':
				if (typeof data.duration !== 'number' || data.duration < 1) {
					errs.push('Delay duration must be at least 1.')
				}
				if (!data.unit) {
					errs.push('Delay unit is required.')
				}
				break
			case 'action_email':
				if (
					!data.subject ||
					typeof data.subject !== 'string' ||
					data.subject.trim() === ''
				) {
					errs.push('Email subject line is required.')
				}
				if (!data.bodyHtml && !data.bodyText) {
					errs.push('Email body content is required.')
				} else {
					const combined = (
						(data.bodyHtml || '') +
						' ' +
						(data.bodyText || '')
					).toLowerCase()
					if (
						combined.includes('lorem ipsum') ||
						combined.includes('insert text here') ||
						combined.includes('default template text')
					) {
						errs.push('Unedited boilerplate text detected in email body.')
					}
				}
				break
			case 'action_sms':
				if (
					!data.messageText ||
					typeof data.messageText !== 'string' ||
					data.messageText.trim() === ''
				) {
					errs.push('SMS message text is required.')
				} else if (data.messageText.length > 1600) {
					errs.push('SMS message exceeds 1600 characters maximum.')
				}
				break
			case 'condition':
				if (
					!data.field ||
					typeof data.field !== 'string' ||
					data.field.trim() === ''
				) {
					errs.push('Condition comparison field is required.')
				}
				if (!data.operator) {
					errs.push('Condition operator is required.')
				}
				break
		}

		if (errs.length > 0) {
			nodeErrors[node.id] = errs
		}
	}

	return {
		...dagResult,
		nodeErrors,
	}
}
