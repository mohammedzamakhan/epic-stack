import { createId } from '@paralleldrive/cuid2'
import {
	count,
	db,
	desc,
	eq,
	PlatformJourneyRun,
	PlatformMarketingJourney,
} from '@repo/database'
import { validateWorkflowDAG } from '@repo/tenant-db/types/journey'
import { type PlatformJourneyListItem } from '../types/platform.ts'

export interface CreatePlatformJourneyInput {
	name: string
	description?: string
	triggerType: string
	triggerConfig?: Record<string, unknown>
	nodes: unknown[]
	edges: unknown[]
	graphJson?: string
}

export async function listPlatformJourneys(): Promise<
	PlatformJourneyListItem[]
> {
	const journeys = await db
		.select()
		.from(PlatformMarketingJourney)
		.orderBy(desc(PlatformMarketingJourney.updatedAt))

	const results: PlatformJourneyListItem[] = []
	for (const journey of journeys) {
		const [runsCountRow] = await db
			.select({ count: count() })
			.from(PlatformJourneyRun)
			.where(eq(PlatformJourneyRun.journeyId, journey.id))

		let stepCount = 0
		try {
			const nodes = journey.nodes ? JSON.parse(journey.nodes) : []
			stepCount = Array.isArray(nodes) ? nodes.length : 0
		} catch {
			stepCount = 0
		}

		results.push({
			id: journey.id,
			name: journey.name,
			description: journey.description,
			status: journey.status as PlatformJourneyListItem['status'],
			triggerType: journey.triggerType,
			stepCount,
			runsCount: runsCountRow?.count ?? 0,
			updatedAt: journey.updatedAt,
			createdAt: journey.createdAt,
		})
	}

	return results
}

export async function getPlatformJourneyById(id: string) {
	const [journey] = await db
		.select()
		.from(PlatformMarketingJourney)
		.where(eq(PlatformMarketingJourney.id, id))

	return journey ?? null
}

export async function createPlatformJourney(input: CreatePlatformJourneyInput) {
	const id = createId()
	const graphJson =
		input.graphJson ||
		JSON.stringify({ nodes: input.nodes, edges: input.edges })

	await db.insert(PlatformMarketingJourney).values({
		id,
		name: input.name,
		description: input.description || null,
		status: 'draft',
		triggerType: input.triggerType,
		triggerConfig: JSON.stringify(input.triggerConfig || {}),
		nodes: JSON.stringify(input.nodes),
		edges: JSON.stringify(input.edges),
		graphJson,
	})

	return getPlatformJourneyById(id)
}

export async function updatePlatformJourney(
	id: string,
	input: Partial<CreatePlatformJourneyInput> & { status?: string },
) {
	const updates: Record<string, unknown> = { updatedAt: new Date() }

	if (input.name !== undefined) updates.name = input.name
	if (input.description !== undefined) updates.description = input.description
	if (input.triggerType !== undefined) updates.triggerType = input.triggerType
	if (input.triggerConfig !== undefined) {
		updates.triggerConfig = JSON.stringify(input.triggerConfig)
	}
	if (input.nodes !== undefined) updates.nodes = JSON.stringify(input.nodes)
	if (input.edges !== undefined) updates.edges = JSON.stringify(input.edges)
	if (input.graphJson !== undefined) updates.graphJson = input.graphJson
	if (input.status !== undefined) updates.status = input.status

	await db
		.update(PlatformMarketingJourney)
		.set(updates)
		.where(eq(PlatformMarketingJourney.id, id))

	return getPlatformJourneyById(id)
}

export async function publishPlatformJourney(id: string) {
	const journey = await getPlatformJourneyById(id)
	if (!journey) throw new Error('Journey not found')

	let graph: unknown
	try {
		graph = journey.graphJson ? JSON.parse(journey.graphJson) : null
	} catch {
		throw new Error('Invalid journey graph')
	}

	const validation = validateWorkflowDAG(graph)
	if (!validation.valid) {
		throw new Error(validation.errors.join('; '))
	}

	await db
		.update(PlatformMarketingJourney)
		.set({
			status: 'active',
			publishedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(PlatformMarketingJourney.id, id))

	return getPlatformJourneyById(id)
}

export async function pausePlatformJourney(id: string) {
	await db
		.update(PlatformMarketingJourney)
		.set({ status: 'paused', updatedAt: new Date() })
		.where(eq(PlatformMarketingJourney.id, id))

	return getPlatformJourneyById(id)
}

export async function deletePlatformJourney(id: string) {
	await db
		.delete(PlatformMarketingJourney)
		.where(eq(PlatformMarketingJourney.id, id))
}

export async function duplicatePlatformJourney(id: string) {
	const journey = await getPlatformJourneyById(id)
	if (!journey) throw new Error('Journey not found')

	return createPlatformJourney({
		name: `${journey.name} (Copy)`,
		description: journey.description || undefined,
		triggerType: journey.triggerType,
		triggerConfig: journey.triggerConfig
			? (JSON.parse(journey.triggerConfig) as Record<string, unknown>)
			: {},
		nodes: journey.nodes ? (JSON.parse(journey.nodes) as unknown[]) : [],
		edges: journey.edges ? (JSON.parse(journey.edges) as unknown[]) : [],
		graphJson: journey.graphJson || undefined,
	})
}
