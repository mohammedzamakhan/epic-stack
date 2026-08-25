import { describe, it, expect } from 'vitest'
import {
	validateWorkflowDAG,
	workflowGraphSchema,
	relaxedWorkflowGraphSchema,
	createJourneySchema,
	updateJourneySchema,
	executeStepPayloadSchema,
	completeRunPayloadSchema,
	calculateDelayMs,
	getDownstreamNodes,
	serializeWorkflowGraph,
	parseWorkflowGraph,
	type WorkflowGraph,
	type WorkflowNode,
	type WorkflowEdge,
} from './journey.ts'

describe('Milestone 1 Adversarial Challenges: validateWorkflowDAG & Schemas', () => {
	// =========================================================================
	// 1. DEEP & WIDE GRAPH SCALE / COMPLEXITY STRESS
	// =========================================================================
	describe('Scale & Topological Complexity Stress', () => {
		it('handles a deep linear chain of 50 nodes without stack issues', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'node-0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 1; i < 50; i++) {
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'hours' },
				})
				edges.push({
					id: `edge-${i - 1}-${i}`,
					source: `node-${i - 1}`,
					target: `node-${i}`,
				})
			}

			const graph = { nodes, edges }
			const result = validateWorkflowDAG(graph)

			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(50)
			expect(result.edgeCount).toBe(49)
			expect(result.triggerNodeId).toBe('node-0')
			expect(result.terminalNodeIds).toEqual(['node-49'])
			expect(result.hasCycles).toBe(false)
			expect(result.errors).toEqual([])
		})

		it('handles a deep linear chain of 500 nodes', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'node-0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 1; i < 500; i++) {
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'minutes' },
				})
				edges.push({
					id: `edge-${i - 1}-${i}`,
					source: `node-${i - 1}`,
					target: `node-${i}`,
				})
			}

			const graph = { nodes, edges }
			const start = performance.now()
			const result = validateWorkflowDAG(graph)
			const duration = performance.now() - start

			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(500)
			expect(result.edgeCount).toBe(499)
			expect(result.terminalNodeIds).toEqual(['node-499'])
			expect(duration).toBeLessThan(100) // Fast execution under 100ms
		})

		it('handles an ultra-deep chain of 2,000 nodes without call stack overflow', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'node-0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 1; i < 2000; i++) {
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'minutes' },
				})
				edges.push({
					id: `edge-${i - 1}-${i}`,
					source: `node-${i - 1}`,
					target: `node-${i}`,
				})
			}

			const graph = { nodes, edges }
			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(2000)
		})

		it('handles wide fan-out (1 trigger -> 100 parallel action nodes)', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'trigger-root',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 1; i <= 100; i++) {
				nodes.push({
					id: `action-${i}`,
					type: 'action_email',
					data: { subject: `Email ${i}`, bodyHtml: `<p>Content ${i}</p>` },
				})
				edges.push({
					id: `e-${i}`,
					source: 'trigger-root',
					target: `action-${i}`,
				})
			}

			const graph = { nodes, edges }
			const result = validateWorkflowDAG(graph)

			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(101)
			expect(result.edgeCount).toBe(100)
			expect(result.terminalNodeIds).toHaveLength(100)
			expect(result.hasCycles).toBe(false)
		})

		it('handles diamond lattice DAG (multiple parallel branches merging to a single terminal node)', () => {
			// Trigger -> Condition -> [Branch A, Branch B, Branch C] -> Delay Merged -> Email Terminal
			const nodes: WorkflowNode[] = [
				{
					id: 'trigger-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
				{
					id: 'cond-1',
					type: 'condition',
					data: { field: 'plan', operator: 'equals', value: 'enterprise' },
				},
				{
					id: 'branch-a',
					type: 'delay',
					data: { duration: 1, unit: 'hours' },
				},
				{
					id: 'branch-b',
					type: 'delay',
					data: { duration: 2, unit: 'hours' },
				},
				{
					id: 'merge-delay',
					type: 'delay',
					data: { duration: 5, unit: 'minutes' },
				},
				{
					id: 'terminal-email',
					type: 'action_email',
					data: { subject: 'Follow up', bodyHtml: '<p>Hi</p>' },
				},
			]
			const edges: WorkflowEdge[] = [
				{ id: 'e1', source: 'trigger-1', target: 'cond-1' },
				{
					id: 'e2',
					source: 'cond-1',
					target: 'branch-a',
					sourceHandle: 'true',
				},
				{
					id: 'e3',
					source: 'cond-1',
					target: 'branch-b',
					sourceHandle: 'false',
				},
				{ id: 'e4', source: 'branch-a', target: 'merge-delay' },
				{ id: 'e5', source: 'branch-b', target: 'merge-delay' },
				{ id: 'e6', source: 'merge-delay', target: 'terminal-email' },
			]

			const graph = { nodes, edges }
			const result = validateWorkflowDAG(graph)

			expect(result.valid).toBe(true)
			expect(result.hasCycles).toBe(false)
			expect(result.terminalNodeIds).toEqual(['terminal-email'])
		})

		it('handles binary tree DAG (depth 5: 31 nodes)', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'node-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 2; i <= 31; i++) {
				const parent = Math.floor(i / 2)
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'hours' },
				})
				edges.push({
					id: `e-${parent}-${i}`,
					source: `node-${parent}`,
					target: `node-${i}`,
				})
			}

			const graph = { nodes, edges }
			const result = validateWorkflowDAG(graph)

			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(31)
			expect(result.edgeCount).toBe(30)
			expect(result.terminalNodeIds).toHaveLength(16) // leaves: 16-31
		})
	})

	// =========================================================================
	// 2. COMPLEX CYCLE TOPOLOGIES (ADVERSARIAL CYCLE DETECTION)
	// =========================================================================
	describe('Complex Adversarial Cycle Topologies', () => {
		it('detects figure-8 interlocking cycles (A->B->C->A and C->D->E->C)', () => {
			const nodes = [
				{
					id: 't-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
				{ id: 'a', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'b', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'c', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'd', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'e', type: 'delay', data: { duration: 1, unit: 'hours' } },
			]
			const edges = [
				{ id: 'e0', source: 't-1', target: 'a' },
				// Cycle 1: a -> b -> c -> a
				{ id: 'e1', source: 'a', target: 'b' },
				{ id: 'e2', source: 'b', target: 'c' },
				{ id: 'e3', source: 'c', target: 'a' },
				// Cycle 2: c -> d -> e -> c
				{ id: 'e4', source: 'c', target: 'd' },
				{ id: 'e5', source: 'd', target: 'e' },
				{ id: 'e6', source: 'e', target: 'c' },
			]

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
			expect(result.errors.some((err) => err.includes('Cycle detected'))).toBe(
				true,
			)
		})

		it('detects cycle in a disconnected orphan component', () => {
			const nodes = [
				// Main connected valid DAG
				{
					id: 't-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
				{
					id: 'email-1',
					type: 'action_email',
					data: { subject: 'Hi', bodyHtml: '<p>Hi</p>' },
				},
				// Disconnected cycle: orphan-1 -> orphan-2 -> orphan-1
				{
					id: 'orphan-1',
					type: 'delay',
					data: { duration: 1, unit: 'hours' },
				},
				{
					id: 'orphan-2',
					type: 'delay',
					data: { duration: 2, unit: 'hours' },
				},
			]
			const edges = [
				{ id: 'e1', source: 't-1', target: 'email-1' },
				{ id: 'e-orp-1', source: 'orphan-1', target: 'orphan-2' },
				{ id: 'e-orp-2', source: 'orphan-2', target: 'orphan-1' },
			]

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
			expect(result.errors.some((err) => err.includes('Cycle detected'))).toBe(
				true,
			)
			expect(result.warnings.some((w) => w.includes('cannot be reached'))).toBe(
				true,
			)
		})

		it('detects cross-branch back-edge cycle across condition branches', () => {
			// Trigger -> Condition -> [LeftBranch: L1 -> L2, RightBranch: R1 -> R2]
			// Cross edge: L2 -> R1, and R2 -> L1 (creates cross-branch cycle)
			const nodes = [
				{
					id: 'trigger-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
				{
					id: 'cond-1',
					type: 'condition',
					data: { field: 'score', operator: 'greater_than', value: '10' },
				},
				{ id: 'L1', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'L2', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'R1', type: 'delay', data: { duration: 1, unit: 'hours' } },
				{ id: 'R2', type: 'delay', data: { duration: 1, unit: 'hours' } },
			]
			const edges = [
				{ id: 'e0', source: 'trigger-1', target: 'cond-1' },
				{ id: 'e1', source: 'cond-1', target: 'L1', sourceHandle: 'true' },
				{ id: 'e2', source: 'cond-1', target: 'R1', sourceHandle: 'false' },
				{ id: 'e3', source: 'L1', target: 'L2' },
				{ id: 'e4', source: 'R1', target: 'R2' },
				{ id: 'e5', source: 'L2', target: 'R1' }, // Cross edge to right
				{ id: 'e6', source: 'R2', target: 'L1' }, // Back edge to left -> Cycle!
			]

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
		})

		it('detects deep cycle located 50 nodes down a branch', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'node-0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			const edges: WorkflowEdge[] = []

			for (let i = 1; i <= 60; i++) {
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'hours' },
				})
				edges.push({
					id: `e-${i - 1}-${i}`,
					source: `node-${i - 1}`,
					target: `node-${i}`,
				})
			}

			// Add cycle from node-55 back to node-45
			edges.push({
				id: 'e-cycle-deep',
				source: 'node-55',
				target: 'node-45',
			})

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
			expect(
				result.errors.some(
					(err) => err.includes('node-45') && err.includes('node-55'),
				),
			).toBe(true)
		})

		it('detects self-loop on terminal action node', () => {
			const nodes = [
				{
					id: 't-1',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
				{
					id: 'email-1',
					type: 'action_email',
					data: { subject: 'Hi', bodyHtml: '<p>Hi</p>' },
				},
			]
			const edges = [
				{ id: 'e1', source: 't-1', target: 'email-1' },
				{ id: 'e-self', source: 'email-1', target: 'email-1' },
			]

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('Self-loop'))).toBe(true)
		})
	})

	// =========================================================================
	// 3. TRIGGER INVARIANTS & STRUCTURAL MALFORMATIONS
	// =========================================================================
	describe('Trigger Invariants & Structural Malformations', () => {
		it('rejects graph with zero triggers', () => {
			const graph = {
				nodes: [
					{
						id: 'd-1',
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					},
					{
						id: 'e-1',
						type: 'action_email',
						data: { subject: 'Hi', bodyHtml: '<p>Hi</p>' },
					},
				],
				edges: [{ id: 'e1', source: 'd-1', target: 'e-1' }],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) =>
					e.includes('must have exactly one trigger node (found 0)'),
				),
			).toBe(true)
		})

		it('rejects graph with multiple (3) triggers', () => {
			const graph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 't-2',
						type: 'trigger',
						data: { triggerType: 'phone_verified', config: {} },
					},
					{
						id: 't-3',
						type: 'trigger',
						data: { triggerType: 'manual', config: {} },
					},
				],
				edges: [],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) =>
					e.includes('can only have one trigger node (found 3: t-1, t-2, t-3)'),
				),
			).toBe(true)
		})

		it('rejects trigger node with incoming edge from an orphan node', () => {
			const graph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'orphan-delay',
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					},
					{
						id: 'email-1',
						type: 'action_email',
						data: { subject: 'Hi', bodyHtml: '<p>Hi</p>' },
					},
				],
				edges: [
					{ id: 'e1', source: 't-1', target: 'email-1' },
					{ id: 'e2', source: 'orphan-delay', target: 't-1' }, // Incoming to trigger!
				],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) =>
					e.includes('Trigger node "t-1" cannot have incoming edges'),
				),
			).toBe(true)
		})

		it('rejects completely empty graph object', () => {
			const graph = { nodes: [], edges: [] }
			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Journey graph must contain at least one trigger node',
			)
		})

		it('handles non-object and null inputs safely without throwing exceptions', () => {
			expect(validateWorkflowDAG(null).valid).toBe(false)
			expect(validateWorkflowDAG(undefined).valid).toBe(false)
			expect(validateWorkflowDAG(42).valid).toBe(false)
			expect(validateWorkflowDAG('string-not-graph').valid).toBe(false)
			expect(validateWorkflowDAG([]).valid).toBe(false)
		})

		it('rejects edge referencing non-existent source AND target', () => {
			const graph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
				],
				edges: [
					{ id: 'e-bad', source: 'ghost-source', target: 'ghost-target' },
				],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) => e.includes('non-existent source node')),
			).toBe(true)
			expect(
				result.errors.some((e) => e.includes('non-existent target node')),
			).toBe(true)
		})

		it('handles single trigger node with 0 edges gracefully as a valid initial draft DAG', () => {
			const graph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
				],
				edges: [],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(true)
			expect(result.nodeCount).toBe(1)
			expect(result.edgeCount).toBe(0)
			expect(result.triggerNodeId).toBe('t-1')
			expect(result.terminalNodeIds).toEqual(['t-1'])
			expect(result.warnings).toHaveLength(0)
		})
	})

	// =========================================================================
	// 4. MALFORMED NODE PAYLOADS & BOUNDARY ATTACKS
	// =========================================================================
	describe('Malformed Node Payloads & Boundary Attacks', () => {
		it('rejects invalid delay parameters (float, 0, negative, invalid unit)', () => {
			// Float duration
			const floatDelay = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'd-1',
						type: 'delay',
						data: { duration: 1.5, unit: 'hours' },
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'd-1' }],
			}
			expect(validateWorkflowDAG(floatDelay).valid).toBe(false)

			// Zero duration
			const zeroDelay = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'd-1',
						type: 'delay',
						data: { duration: 0, unit: 'hours' },
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'd-1' }],
			}
			expect(validateWorkflowDAG(zeroDelay).valid).toBe(false)

			// Invalid unit
			const badUnit = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'd-1',
						type: 'delay',
						data: { duration: 5, unit: 'months' }, // invalid unit
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'd-1' }],
			}
			expect(validateWorkflowDAG(badUnit).valid).toBe(false)
		})

		it('rejects invalid SMS action payloads (> 1600 characters or empty)', () => {
			const longSms = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'sms-1',
						type: 'action_sms',
						data: { messageText: 'x'.repeat(1601) },
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'sms-1' }],
			}
			const longRes = validateWorkflowDAG(longSms)
			expect(longRes.valid).toBe(false)
			expect(
				longRes.errors.some((e) =>
					e.includes('SMS message cannot exceed 1600 characters'),
				),
			).toBe(true)

			// Exact 1600 characters is valid
			const exact1600 = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'sms-1',
						type: 'action_sms',
						data: { messageText: 'x'.repeat(1600) },
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'sms-1' }],
			}
			expect(validateWorkflowDAG(exact1600).valid).toBe(true)
		})

		it('rejects invalid condition operators', () => {
			const badCondition = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'c-1',
						type: 'condition',
						data: { field: 'tag', operator: 'regex_match', value: '.*' },
					},
				],
				edges: [{ id: 'e1', source: 't-1', target: 'c-1' }],
			}
			const res = validateWorkflowDAG(badCondition)
			expect(res.valid).toBe(false)
			expect(
				res.errors.some((e) =>
					e.includes('Condition node "c-1" has invalid configuration'),
				),
			).toBe(true)
		})

		it('warns when condition node has > 2 outgoing connections', () => {
			const condition3Branches = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'c-1',
						type: 'condition',
						data: { field: 'tag', operator: 'equals', value: 'gold' },
					},
					{
						id: 'e-1',
						type: 'action_email',
						data: { subject: '1', bodyHtml: '1' },
					},
					{
						id: 'e-2',
						type: 'action_email',
						data: { subject: '2', bodyHtml: '2' },
					},
					{
						id: 'e-3',
						type: 'action_email',
						data: { subject: '3', bodyHtml: '3' },
					},
				],
				edges: [
					{ id: 'e0', source: 't-1', target: 'c-1' },
					{ id: 'e1', source: 'c-1', target: 'e-1' },
					{ id: 'e2', source: 'c-1', target: 'e-2' },
					{ id: 'e3', source: 'c-1', target: 'e-3' },
				],
			}

			const res = validateWorkflowDAG(condition3Branches)
			expect(res.valid).toBe(true) // Valid DAG, but has warning
			expect(
				res.warnings.some((w) =>
					w.includes(
						'Condition node "c-1" has more than 2 outgoing connections (3)',
					),
				),
			).toBe(true)
		})

		it('handles unicode, Arabic text, and emoji across nodes and edge IDs', () => {
			const unicodeGraph = {
				nodes: [
					{
						id: 'عقدة-البداية-🎯',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'رسالة-الترحيب-💌',
						type: 'action_email',
						data: {
							subject: 'أهلاً بك يا {{name}} في منصتنا 🚀',
							bodyHtml: '<h1>مرحباً بك!</h1><p>كود الخصم: 50OFF</p>',
						},
					},
				],
				edges: [
					{
						id: 'رابط-1-➡️',
						source: 'عقدة-البداية-🎯',
						target: 'رسالة-الترحيب-💌',
					},
				],
			}

			const res = validateWorkflowDAG(unicodeGraph)
			expect(res.valid).toBe(true)
			expect(res.triggerNodeId).toBe('عقدة-البداية-🎯')
			expect(res.terminalNodeIds).toEqual(['رسالة-الترحيب-💌'])
		})

		it('handles special injection characters in IDs safely without regex crashes', () => {
			const specialGraph = {
				nodes: [
					{
						id: 't-1.*+?^${}()|[]\\',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'node\'--"<script>alert(1)</script>',
						type: 'action_sms',
						data: { messageText: 'Safety check' },
					},
				],
				edges: [
					{
						id: 'e-injection',
						source: 't-1.*+?^${}()|[]\\',
						target: 'node\'--"<script>alert(1)</script>',
					},
				],
			}

			const res = validateWorkflowDAG(specialGraph)
			expect(res.valid).toBe(true)
			expect(res.nodeCount).toBe(2)
		})
	})

	// =========================================================================
	// 5. HELPER UTILITIES & SERIALIZATION STRESS
	// =========================================================================
	describe('Helper Utilities & Serialization Stress', () => {
		it('calculateDelayMs computes correct values across edge durations', () => {
			expect(calculateDelayMs(0, 'minutes')).toBe(0)
			expect(calculateDelayMs(100, 'minutes')).toBe(100 * 60 * 1000)
			expect(calculateDelayMs(48, 'hours')).toBe(48 * 3600 * 1000)
			expect(calculateDelayMs(30, 'days')).toBe(30 * 86400 * 1000)
			expect(calculateDelayMs(52, 'weeks')).toBe(52 * 7 * 86400 * 1000)
		})

		it('getDownstreamNodes correctly handles single, multiple, and missing handles', () => {
			const graph = {
				edges: [
					{ id: '1', source: 'c1', target: 'n1', sourceHandle: 'true' },
					{ id: '2', source: 'c1', target: 'n2', sourceHandle: 'false' },
					{ id: '3', source: 'c1', target: 'n3', sourceHandle: 'default' },
					{ id: '4', source: 'c1', target: 'n4' },
					{ id: '5', source: 'c1', target: 'n5', sourceHandle: null },
				],
			}

			expect(getDownstreamNodes(graph, 'c1')).toEqual([
				'n1',
				'n2',
				'n3',
				'n4',
				'n5',
			])
			expect(getDownstreamNodes(graph, 'c1', 'true')).toEqual(['n1'])
			expect(getDownstreamNodes(graph, 'c1', 'false')).toEqual(['n2'])
			expect(getDownstreamNodes(graph, 'c1', 'default')).toEqual(['n3'])
			expect(getDownstreamNodes(graph, 'c1', null)).toEqual(['n4', 'n5'])
			expect(getDownstreamNodes(graph, 'c1', undefined)).toEqual([
				'n1',
				'n2',
				'n3',
				'n4',
				'n5',
			])
			expect(getDownstreamNodes(graph, 'nonexistent')).toEqual([])
		})

		it('serializeWorkflowGraph and parseWorkflowGraph roundtrip with complex graph', () => {
			const original: WorkflowGraph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						position: { x: 100.5, y: -200.25 },
						data: { triggerType: 'customer_signup', config: { tag: 'vip' } },
					},
					{
						id: 'e-1',
						type: 'action_email',
						position: { x: 300, y: 400 },
						data: {
							subject: 'Hello {{name}}',
							bodyHtml: '<p>Content</p>',
							fromName: 'Store',
						},
					},
				],
				edges: [
					{
						id: 'e-1-2',
						source: 't-1',
						target: 'e-1',
						sourceHandle: 'out',
						targetHandle: 'in',
					},
				],
				viewport: { x: -50, y: 100, zoom: 0.75 },
			}

			const json = serializeWorkflowGraph(original)
			const parsed = parseWorkflowGraph(json)

			expect(parsed).toEqual(original)
		})

		it('parseWorkflowGraph throws ZodError on corrupt or invalid JSON graph', () => {
			expect(() => parseWorkflowGraph('{ invalid json')).toThrow()
			expect(() =>
				parseWorkflowGraph(JSON.stringify({ nodes: 'not-an-array' })),
			).toThrow()
			expect(() =>
				parseWorkflowGraph(
					JSON.stringify({
						nodes: [{ id: 'n1', type: 'invalid_type', data: {} }],
						edges: [],
					}),
				),
			).toThrow()
		})
	})

	// =========================================================================
	// 6. DENSE LATTICES, TOURNAMENT DAGS & CYCLE PATH ACCURACY
	// =========================================================================
	describe('Dense Lattices, Transitive Tournaments & Cycle Path Accuracy', () => {
		it('accurately validates 5x5 grid lattice DAG (25 nodes, 40 edges)', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'n_0_0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			for (let r = 0; r < 5; r++) {
				for (let c = 0; c < 5; c++) {
					if (r === 0 && c === 0) continue
					nodes.push({
						id: `n_${r}_${c}`,
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					})
				}
			}

			const edges: WorkflowEdge[] = []
			for (let r = 0; r < 5; r++) {
				for (let c = 0; c < 5; c++) {
					// Right edge
					if (c + 1 < 5) {
						edges.push({
							id: `e_${r}_${c}->${r}_${c + 1}`,
							source: `n_${r}_${c}`,
							target: `n_${r}_${c + 1}`,
						})
					}
					// Down edge
					if (r + 1 < 5) {
						edges.push({
							id: `e_${r}_${c}->${r + 1}_${c}`,
							source: `n_${r}_${c}`,
							target: `n_${r + 1}_${c}`,
						})
					}
				}
			}

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(true)
			expect(result.hasCycles).toBe(false)
			expect(result.nodeCount).toBe(25)
			expect(result.edgeCount).toBe(40)
			expect(result.terminalNodeIds).toEqual(['n_4_4'])
		})

		it('detects a subtle diagonal back-edge in a 5x5 grid lattice (n_4_3 -> n_1_2)', () => {
			const nodes: WorkflowNode[] = [
				{
					id: 'n_0_0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			for (let r = 0; r < 5; r++) {
				for (let c = 0; c < 5; c++) {
					if (r === 0 && c === 0) continue
					nodes.push({
						id: `n_${r}_${c}`,
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					})
				}
			}

			const edges: WorkflowEdge[] = []
			for (let r = 0; r < 5; r++) {
				for (let c = 0; c < 5; c++) {
					if (c + 1 < 5) {
						edges.push({
							id: `e_${r}_${c}->${r}_${c + 1}`,
							source: `n_${r}_${c}`,
							target: `n_${r}_${c + 1}`,
						})
					}
					if (r + 1 < 5) {
						edges.push({
							id: `e_${r}_${c}->${r + 1}_${c}`,
							source: `n_${r}_${c}`,
							target: `n_${r + 1}_${c}`,
						})
					}
				}
			}

			// Add diagonal back-edge creating cycle
			edges.push({
				id: 'e_back_diag',
				source: 'n_4_3',
				target: 'n_1_2',
			})

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
			expect(result.errors.some((e) => e.includes('Cycle detected'))).toBe(true)
		})

		it('handles ultra-dense transitive tournament DAG (30 nodes, 435 edges)', () => {
			const n = 30
			const nodes: WorkflowNode[] = [
				{
					id: 'node-0',
					type: 'trigger',
					data: { triggerType: 'customer_signup', config: {} },
				},
			]
			for (let i = 1; i < n; i++) {
				nodes.push({
					id: `node-${i}`,
					type: 'delay',
					data: { duration: 1, unit: 'minutes' },
				})
			}

			// All forward edges i -> j for all 0 <= i < j < n
			const edges: WorkflowEdge[] = []
			for (let i = 0; i < n; i++) {
				for (let j = i + 1; j < n; j++) {
					edges.push({
						id: `e-${i}-${j}`,
						source: `node-${i}`,
						target: `node-${j}`,
					})
				}
			}

			expect(edges).toHaveLength((n * (n - 1)) / 2) // 435 edges

			const result = validateWorkflowDAG({ nodes, edges })
			expect(result.valid).toBe(true)
			expect(result.hasCycles).toBe(false)
			expect(result.terminalNodeIds).toEqual([`node-${n - 1}`])
		})

		it('verifies formatted cycle path string in error output', () => {
			const graph = {
				nodes: [
					{
						id: 't-1',
						type: 'trigger',
						data: { triggerType: 'customer_signup', config: {} },
					},
					{
						id: 'step-A',
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					},
					{
						id: 'step-B',
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					},
					{
						id: 'step-C',
						type: 'delay',
						data: { duration: 1, unit: 'hours' },
					},
				],
				edges: [
					{ id: 'e1', source: 't-1', target: 'step-A' },
					{ id: 'e2', source: 'step-A', target: 'step-B' },
					{ id: 'e3', source: 'step-B', target: 'step-C' },
					{ id: 'e4', source: 'step-C', target: 'step-A' },
				],
			}

			const result = validateWorkflowDAG(graph)
			expect(result.valid).toBe(false)
			expect(result.hasCycles).toBe(true)
			const cycleError = result.errors.find((e) => e.includes('Cycle detected'))
			expect(cycleError).toBeDefined()
			expect(cycleError).toContain('step-A -> step-B -> step-C -> step-A')
		})
	})

	// =========================================================================
	// 7. API & MUTATION SCHEMA BOUNDARY FUZZING
	// =========================================================================
	describe('API & Mutation Schema Boundary Fuzzing', () => {
		it('fuzzes createJourneySchema with extreme inputs', () => {
			// Empty name rejected
			expect(() => createJourneySchema.parse({ name: '' })).toThrow()

			// Max name (200 chars) accepted
			expect(
				createJourneySchema.parse({ name: 'A'.repeat(200) }).name,
			).toHaveLength(200)

			// Over-max name (201 chars) rejected
			expect(() =>
				createJourneySchema.parse({ name: 'A'.repeat(201) }),
			).toThrow()

			// Over-max description (1001 chars) rejected
			expect(() =>
				createJourneySchema.parse({
					name: 'Valid Name',
					description: 'D'.repeat(1001),
				}),
			).toThrow()

			// Default fallbacks applied
			const parsed = createJourneySchema.parse({ name: 'Default Flow' })
			expect(parsed.triggerType).toBe('customer_signup')
			expect(parsed.triggerConfig).toEqual({})
			expect(parsed.nodes).toEqual([])
			expect(parsed.edges).toEqual([])
		})

		it('fuzzes executeStepPayloadSchema UUID validations', () => {
			// Valid UUIDs accepted
			const valid = executeStepPayloadSchema.parse({
				orgId: 'org_123',
				journeyId: '123e4567-e89b-12d3-a456-426614174000',
				runId: '123e4567-e89b-12d3-a456-426614174001',
				customerId: 'cust_999',
				nodeId: 'node-action',
				nodeType: 'action_email',
				config: { subject: 'test' },
			})
			expect(valid.orgId).toBe('org_123')

			// Malformed UUID for journeyId rejected
			expect(() =>
				executeStepPayloadSchema.parse({
					orgId: 'org_123',
					journeyId: 'not-a-valid-uuid',
					runId: '123e4567-e89b-12d3-a456-426614174001',
					customerId: 'cust_999',
					nodeId: 'node-action',
					nodeType: 'action_email',
					config: {},
				}),
			).toThrow()

			// Malformed UUID for runId rejected
			expect(() =>
				executeStepPayloadSchema.parse({
					orgId: 'org_123',
					journeyId: '123e4567-e89b-12d3-a456-426614174000',
					runId: 'not-a-valid-uuid',
					customerId: 'cust_999',
					nodeId: 'node-action',
					nodeType: 'action_email',
					config: {},
				}),
			).toThrow()

			// Invalid nodeType rejected
			expect(() =>
				executeStepPayloadSchema.parse({
					orgId: 'org_123',
					journeyId: '123e4567-e89b-12d3-a456-426614174000',
					runId: '123e4567-e89b-12d3-a456-426614174001',
					customerId: 'cust_999',
					nodeId: 'node-action',
					nodeType: 'unknown_step_type' as unknown as 'action_email',
					config: {},
				}),
			).toThrow()
		})

		it('fuzzes completeRunPayloadSchema status validation', () => {
			expect(
				completeRunPayloadSchema.parse({
					orgId: 'org_1',
					runId: '123e4567-e89b-12d3-a456-426614174000',
					status: 'completed',
				}).status,
			).toBe('completed')

			expect(
				completeRunPayloadSchema.parse({
					orgId: 'org_1',
					runId: '123e4567-e89b-12d3-a456-426614174000',
					status: 'failed',
					errorMessage: 'Timeout error',
				}).status,
			).toBe('failed')

			expect(
				completeRunPayloadSchema.parse({
					orgId: 'org_1',
					runId: '123e4567-e89b-12d3-a456-426614174000',
					status: 'cancelled',
					errorMessage: null,
				}).status,
			).toBe('cancelled')

			// Invalid status rejected
			expect(() =>
				completeRunPayloadSchema.parse({
					orgId: 'org_1',
					runId: '123e4567-e89b-12d3-a456-426614174000',
					status: 'pending' as unknown as 'completed',
				}),
			).toThrow()
		})
	})
})
