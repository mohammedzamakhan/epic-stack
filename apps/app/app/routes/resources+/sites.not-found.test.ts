import type * as DatabaseModule from '@repo/database'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
	mockDb,
	mockSelectResults,
	resetMockDb,
} from '#tests/setup/drizzle-mock.ts'
import { action } from './sites.not-found.ts'

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
		Organization: drizzleTable,
		WebsiteNotFoundLog: drizzleTable,
		and: drizzleOperator,
		eq: drizzleOperator,
		inArray: drizzleOperator,
		sql: (strings: TemplateStringsArray) => strings.join(''),
	}
})

describe('sites.not-found resource route', () => {
	beforeEach(() => {
		resetMockDb()
		vi.clearAllMocks()
	})

	it('rejects non-POST requests', async () => {
		const request = new Request('http://localhost/resources/sites/not-found', {
			method: 'GET',
		})
		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(405)
	})

	it('validates payload requires slug or host and valid path', async () => {
		const request = new Request('http://localhost/resources/sites/not-found', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: '' }),
		})
		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(400)
	})

	it('records a new 404 hit when org found and no existing log', async () => {
		// Mock finding organization, then checking existing log (empty)
		mockSelectResults([{ id: 'org-123' }], [])

		const request = new Request('http://localhost/resources/sites/not-found', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				slug: 'acme',
				path: '/missing-product',
				referrer: 'https://google.com',
			}),
		})

		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(200)
		const data = await response.json()
		expect(data).toEqual({ ok: true })
		expect(mockDb.insert).toHaveBeenCalled()
	})

	it('increments 404 hit when existing log entry exists', async () => {
		// Mock finding organization, then existing log found
		mockSelectResults([{ id: 'org-123' }], [{ id: 'log-1' }])

		const request = new Request('http://localhost/resources/sites/not-found', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				slug: 'acme',
				path: '/missing-product',
			}),
		})

		const response = await action({ request, params: {}, context: {} } as any)
		expect(response.status).toBe(200)
		expect(mockDb.update).toHaveBeenCalled()
	})
})
