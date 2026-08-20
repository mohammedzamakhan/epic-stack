import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryChain, mockDb, resetMockDb } from '../utils/mock-database'

vi.mock('@repo/database', () => {
	const table = new Proxy({}, { get: (_, property) => property })
	return {
		db: mockDb,
		Integration: table,
		IntegrationLog: table,
		NoteIntegrationConnection: table,
		Organization: table,
		OrganizationNote: table,
		and: vi.fn(),
		count: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		gte: vi.fn(),
	}
})

import { integrationManager } from '../../src/integration-manager'

describe('Integration error handling', () => {
	beforeEach(() => {
		resetMockDb()
	})

	it('reports a missing integration as inactive', async () => {
		mockDb.select.mockImplementationOnce(() => queryChain([]))

		await expect(
			integrationManager.getAvailableChannels('missing'),
		).rejects.toThrow('Integration not found or inactive')
	})

	it('surfaces database failures from a select query', async () => {
		mockDb.select.mockImplementationOnce(() => ({
			from: () => ({
				where: () => ({
					limit: () =>
						({
							then: (
								resolve: (value: unknown) => unknown,
								reject?: (error: unknown) => unknown,
							) =>
								Promise.reject(new Error('Database query failed')).then(
									resolve,
									reject,
								),
						}) as any,
				}),
			}),
		}))

		await expect(
			integrationManager.getAvailableChannels('integration-1'),
		).rejects.toThrow('Database query failed')
	})
})
