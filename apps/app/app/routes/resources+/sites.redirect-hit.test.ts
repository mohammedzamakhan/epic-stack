import type * as DatabaseModule from '@repo/database'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockDb, resetMockDb } from '#tests/setup/drizzle-mock.ts'
import { action } from './sites.redirect-hit.ts'

vi.mock('#app/utils/rate-limit.server.ts', () => ({
	PUBLIC_SITE_RATE_LIMIT: {},
	checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
	createRateLimitResponse: vi.fn(),
}))

vi.mock('@repo/security', () => ({
	getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>()
	const { mockDb, drizzleTable, drizzleOperator } =
		await import('#tests/setup/drizzle-mock.ts')
	return {
		...actual,
		db: mockDb,
		WebsiteRedirect: drizzleTable,
		eq: drizzleOperator,
		sql: (strings: TemplateStringsArray) => strings.join(''),
	}
})

describe('sites.redirect-hit resource route', () => {
	beforeEach(() => {
		resetMockDb()
		vi.clearAllMocks()
	})

	it('rejects non-POST requests', async () => {
		const request = new Request(
			'http://localhost/resources/sites/redirect-hit',
			{
				method: 'GET',
			},
		)
		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(405)
	})

	it('rejects missing id', async () => {
		const request = new Request(
			'http://localhost/resources/sites/redirect-hit',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			},
		)
		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(400)
	})

	it('updates hit count and lastTriggeredAt for valid id', async () => {
		const request = new Request(
			'http://localhost/resources/sites/redirect-hit',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: 'redirect-123' }),
			},
		)
		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(200)
		const data = await response.json()
		expect(data).toEqual({ ok: true })
		expect(mockDb.update).toHaveBeenCalled()
	})
})
