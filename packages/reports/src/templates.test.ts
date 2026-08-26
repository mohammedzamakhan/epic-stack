import { describe, expect, it } from 'vitest'
import { definitionForNewReport } from './templates.ts'

describe('definitionForNewReport', () => {
	it('uses the matching template when an id is provided', () => {
		const definition = definitionForNewReport('platform', 'audit-severity')
		expect(definition.subject).toBe('audit_logs')
		expect(definition.groupBy).toEqual(['severity'])
		expect(definition.settings.title).toBe('Audit log severity')
	})

	it('falls back to the blank definition for an unknown template', () => {
		const definition = definitionForNewReport('platform', 'does-not-exist')
		expect(definition.subject).toBe('organizations')
		expect(definition.groupBy).toEqual(['dataRegion'])
		expect(definition.settings.title).toBe('New Report')
	})

	it('switches between templates without retaining the previous subject', () => {
		const first = definitionForNewReport('platform', 'orgs-by-region')
		const second = definitionForNewReport('platform', 'audit-severity')
		expect(first.subject).toBe('organizations')
		expect(second.subject).toBe('audit_logs')
		expect(second.groupBy).toEqual(['severity'])
	})

	it('creates weekly and list customer templates', () => {
		const weekly = definitionForNewReport('organization', 'customers-by-week')
		expect(weekly.groupBy).toEqual(['createdAt'])
		expect(weekly.timeBucket).toBe('week')
		expect(weekly.visualization.chartStyle).toBe('bar')

		const list = definitionForNewReport('organization', 'customer-list')
		expect(list.visualization.chartStyle).toBe('table')
		expect(list.groupBy).toEqual([])
		expect(list.columns).toEqual(['name', 'email', 'phone', 'createdAt'])
	})
})
