import { describe, expect, it } from 'vitest'
import { organizationCatalog } from './catalog.ts'
import {
	createReportDefinition,
	emptyFilterGroup,
	countFilterConditions,
	flattenFilterConditions,
	reportDefinitionSchema,
} from './dsl.ts'
import { isReportRunError, runReport } from './engine.ts'

const now = new Date('2026-08-24T18:00:00.000Z')

function notesDefinition() {
	return createReportDefinition({
		subject: 'notes',
		timeframe: { field: 'createdAt', preset: 'last_3_months' },
		groupBy: ['status'],
		visualization: {
			chartStyle: 'pie',
			measure: 'count',
			sortBy: 'value_desc',
			hideCounts: false,
		},
		settings: { title: 'Notes by status', notes: '', timezone: 'user' },
	})
}

describe('report DSL', () => {
	it('parses a valid definition', () => {
		const parsed = reportDefinitionSchema.parse(notesDefinition())
		expect(parsed.version).toBe(1)
		expect(parsed.groupBy).toEqual(['status'])
	})
})

describe('runReport', () => {
	it('groups and percents matching records', () => {
		const result = runReport(
			organizationCatalog,
			notesDefinition(),
			[
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Todo',
					priority: 'low',
					isPublic: true,
				},
				{
					createdAt: '2026-08-02T00:00:00.000Z',
					status: 'Todo',
					priority: 'high',
					isPublic: true,
				},
				{
					createdAt: '2026-08-03T00:00:00.000Z',
					status: 'Done',
					priority: 'low',
					isPublic: false,
				},
				{
					createdAt: '2025-01-01T00:00:00.000Z',
					status: 'Done',
					priority: 'low',
					isPublic: true,
				},
			],
			now,
		)

		expect(isReportRunError(result)).toBe(false)
		if (isReportRunError(result)) return
		expect(result.total).toBe(3)
		expect(result.segments[0]).toMatchObject({
			label: 'Todo',
			count: 2,
			percent: expect.closeTo(66.66, 1),
		})
		expect(result.segments[1]).toMatchObject({ label: 'Done', count: 1 })
	})

	it('requires groupBy for pie charts', () => {
		const result = runReport(
			organizationCatalog,
			{
				...notesDefinition(),
				groupBy: [],
			},
			[],
			now,
		)
		expect(isReportRunError(result)).toBe(true)
		if (!isReportRunError(result)) return
		expect(result.error).toBe('missing_group_by')
	})

	it('applies AND filters', () => {
		const result = runReport(
			organizationCatalog,
			{
				...notesDefinition(),
				filters: {
					combinator: 'and',
					conditions: [{ field: 'priority', operator: 'eq', value: 'high' }],
				},
			},
			[
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Todo',
					priority: 'high',
				},
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Todo',
					priority: 'low',
				},
			],
			now,
		)
		expect(isReportRunError(result)).toBe(false)
		if (isReportRunError(result)) return
		expect(result.total).toBe(1)
	})

	it('returns a single number without grouping', () => {
		const result = runReport(
			organizationCatalog,
			{
				...notesDefinition(),
				groupBy: [],
				visualization: {
					chartStyle: 'single_number',
					measure: 'count',
					sortBy: 'none',
					hideCounts: false,
				},
			},
			[
				{ createdAt: '2026-08-01T00:00:00.000Z', status: 'Todo' },
				{ createdAt: '2026-08-02T00:00:00.000Z', status: 'Done' },
			],
			now,
		)
		expect(isReportRunError(result)).toBe(false)
		if (isReportRunError(result)) return
		expect(result.total).toBe(2)
		expect(result.segments).toHaveLength(1)
	})

	it('supports nested OR groups', () => {
		const result = runReport(
			organizationCatalog,
			{
				...notesDefinition(),
				filters: {
					combinator: 'or',
					conditions: [
						{ field: 'priority', operator: 'eq', value: 'high' },
						{
							combinator: 'and',
							conditions: [{ field: 'status', operator: 'eq', value: 'Done' }],
						},
					],
				},
			},
			[
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Todo',
					priority: 'high',
				},
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Done',
					priority: 'low',
				},
				{
					createdAt: '2026-08-01T00:00:00.000Z',
					status: 'Todo',
					priority: 'low',
				},
			],
			now,
		)
		expect(isReportRunError(result)).toBe(false)
		if (isReportRunError(result)) return
		expect(result.total).toBe(2)
	})

	it('flattens nested filter groups into leaf conditions', () => {
		const flat = flattenFilterConditions({
			combinator: 'and',
			conditions: [
				{ field: 'region', operator: 'eq', value: 'us' },
				{
					combinator: 'or',
					conditions: [
						{ field: 'status', operator: 'eq', value: 'active' },
						{ field: 'status', operator: 'eq', value: 'trial' },
					],
				},
			],
		})
		expect(flat.map((item) => item.field)).toEqual([
			'region',
			'status',
			'status',
		])
		expect(countFilterConditions({ combinator: 'and', conditions: flat })).toBe(
			3,
		)
	})

	it('counts conditions inside nested groups', () => {
		expect(
			countFilterConditions({
				combinator: 'and',
				conditions: [
					{ field: 'a', operator: 'eq', value: '1' },
					{
						combinator: 'or',
						conditions: [
							{ field: 'b', operator: 'eq', value: '2' },
							{
								combinator: 'and',
								conditions: [{ field: 'c', operator: 'eq', value: '3' }],
							},
						],
					},
				],
			}),
		).toBe(3)
	})

	it('does not use unused emptyFilterGroup in a way that fails types', () => {
		expect(emptyFilterGroup().conditions).toEqual([])
	})
})
