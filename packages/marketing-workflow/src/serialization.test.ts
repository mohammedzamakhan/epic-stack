import { type Edge, type Node } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import {
	reactFlowToWorkflowGraph,
	workflowGraphToReactFlow,
} from './serialization.ts'

describe('workflow serialization', () => {
	it('serializes merge tags, rounded positions, and viewport', () => {
		const reactFlowNodes: Node[] = [
			{
				id: 'trigger_1',
				type: 'trigger',
				position: { x: 100.4, y: 200.7 },
				data: { triggerType: 'customer_signup', config: { plan: 'pro' } },
			},
			{
				id: 'email_1',
				type: 'action_email',
				position: { x: 100.1, y: 400.9 },
				data: {
					subject: 'Welcome {{name}} to {{company}}!',
					bodyHtml: '<p>Hello {{name}}, your phone is {{phone}}.</p>',
					bodyText: 'Hello {{name}}',
					fromName: 'Support Team',
				},
			},
			{
				id: 'cond_1',
				type: 'condition',
				position: { x: 100, y: 600 },
				data: {
					field: 'tags',
					operator: 'contains',
					value: 'vip',
				},
			},
		]

		const reactFlowEdges: Edge[] = [
			{
				id: 'e1',
				source: 'trigger_1',
				target: 'email_1',
				sourceHandle: 'output',
				targetHandle: 'input',
			},
			{
				id: 'e2',
				source: 'email_1',
				target: 'cond_1',
				sourceHandle: 'output',
				targetHandle: 'input',
			},
		]

		const serialized = reactFlowToWorkflowGraph(
			reactFlowNodes,
			reactFlowEdges,
			{
				x: 10,
				y: 20,
				zoom: 1.5,
			},
		)

		expect(serialized.nodes).toHaveLength(3)
		expect(serialized.edges).toHaveLength(2)
		expect(serialized.viewport?.zoom).toBe(1.5)
		expect(serialized.nodes[0]!.position).toEqual({ x: 100, y: 201 })
		expect((serialized.nodes[1]!.data as { subject: string }).subject).toBe(
			'Welcome {{name}} to {{company}}!',
		)

		const deserialized = workflowGraphToReactFlow(serialized)
		expect(deserialized.nodes).toHaveLength(3)
		expect(deserialized.edges).toHaveLength(2)
		expect(deserialized.viewport?.zoom).toBe(1.5)
		expect(deserialized.nodes[1]!.data.subject).toBe(
			'Welcome {{name}} to {{company}}!',
		)
	})

	it('round-trips a branching workflow graph', () => {
		const reactFlowNodes: Node[] = [
			{
				id: 'node_trig_1',
				type: 'trigger',
				position: { x: 200, y: 50 },
				data: { triggerType: 'customer_signup' },
			},
			{
				id: 'node_delay_1',
				type: 'delay',
				position: { x: 200, y: 180 },
				data: { duration: 2, unit: 'days' },
			},
			{
				id: 'node_cond_1',
				type: 'condition',
				position: { x: 200, y: 310 },
				data: { field: 'tags', operator: 'contains', value: 'vip' },
			},
			{
				id: 'node_email_1',
				type: 'action_email',
				position: { x: 50, y: 450 },
				data: { subject: 'VIP', bodyHtml: '<p>VIP</p>' },
			},
			{
				id: 'node_sms_1',
				type: 'action_sms',
				position: { x: 300, y: 350 },
				data: { messageText: 'Hi {{name}}' },
			},
		]

		const reactFlowEdges: Edge[] = [
			{ id: 'e1', source: 'node_trig_1', target: 'node_delay_1' },
			{ id: 'e2', source: 'node_delay_1', target: 'node_cond_1' },
			{
				id: 'e3_t',
				source: 'node_cond_1',
				target: 'node_email_1',
				sourceHandle: 'true',
			},
			{
				id: 'e3_f',
				source: 'node_cond_1',
				target: 'node_sms_1',
				sourceHandle: 'false',
			},
		]

		const canonicalGraph = reactFlowToWorkflowGraph(
			reactFlowNodes,
			reactFlowEdges,
			{
				x: 0,
				y: 0,
				zoom: 1,
			},
		)
		expect(canonicalGraph.nodes).toHaveLength(5)
		expect(canonicalGraph.edges).toHaveLength(4)

		const deserialized = workflowGraphToReactFlow(canonicalGraph)
		expect(deserialized.nodes).toHaveLength(5)
		expect(deserialized.edges).toHaveLength(4)
		expect(deserialized.nodes[0]!.id).toBe('node_trig_1')
		expect(deserialized.nodes[0]!.position).toEqual({ x: 200, y: 50 })
	})

	it('falls back to the default journey for invalid input', () => {
		const fallbackFromNull = workflowGraphToReactFlow(null)
		expect(fallbackFromNull.nodes.length).toBeGreaterThan(0)
		expect(fallbackFromNull.nodes[0]!.type).toBe('trigger')

		const fallbackFromGarbage = workflowGraphToReactFlow('{ invalid json {{{')
		expect(fallbackFromGarbage.nodes.length).toBeGreaterThan(0)
		expect(fallbackFromGarbage.nodes[0]!.type).toBe('trigger')
	})
})
