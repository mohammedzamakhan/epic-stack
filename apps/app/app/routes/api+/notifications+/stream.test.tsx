import type * as DatabaseModule from '@repo/database'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
	mockDb,
	mockSelectResults,
	resetMockDb,
} from '#tests/setup/drizzle-mock.ts'
import { loader } from './stream.tsx'

vi.mock('@repo/auth', () => ({
	requireUserId: vi.fn().mockResolvedValue('user1'),
}))

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>()
	const { mockDb, drizzleTable, drizzleOperator } =
		await import('#tests/setup/drizzle-mock.ts')
	return {
		...actual,
		db: mockDb,
		Notification: drizzleTable,
		Organization: drizzleTable,
		and: drizzleOperator,
		asc: drizzleOperator,
		eq: drizzleOperator,
		gte: drizzleOperator,
	}
})

describe('Notifications Stream API', () => {
	beforeEach(() => {
		resetMockDb()
	})

	it('returns a stream with correct headers', async () => {
		const request = new Request('http://localhost/api/notifications/stream')
		const response = await loader({ request, params: {} } as any)

		expect(response.headers.get('Content-Type')).toBe('text/event-stream')
		expect(response.headers.get('Cache-Control')).toBe('no-cache')
		expect(response.headers.get('Connection')).toBe('keep-alive')
		expect(response.body).toBeInstanceOf(ReadableStream)
	})

	it('applies orgSlug filter if provided', async () => {
		mockSelectResults([{ id: 'org1' }])

		const request = new Request(
			'http://localhost/api/notifications/stream?orgSlug=acme',
		)
		await loader({ request, params: {} } as any)

		expect(mockDb.select).toHaveBeenCalledTimes(1)
	})

	it('returns 404 instead of polling every organization for an unknown slug', async () => {
		mockSelectResults([])

		const request = new Request(
			'http://localhost/api/notifications/stream?orgSlug=missing',
		)
		const response = await loader({ request, params: {} } as any)

		expect(response.status).toBe(404)
		expect(mockDb.select).toHaveBeenCalledTimes(1)
	})

	it('waits for a slow poll to finish before scheduling the next one', async () => {
		vi.useFakeTimers()
		let resolvePoll: (notifications: unknown[]) => void
		const pendingPoll = new Promise<unknown[]>((resolve) => {
			resolvePoll = resolve
		})
		const query: any = {
			from: () => query,
			where: () => query,
			orderBy: () => query,
			then: (resolve: (value: unknown[]) => unknown) =>
				pendingPoll.then(resolve),
		}
		mockDb.select.mockReturnValue(query)

		const response = await loader({
			request: new Request('http://localhost/api/notifications/stream'),
			params: {},
		} as any)

		try {
			vi.advanceTimersByTime(3000)
			await Promise.resolve()
			expect(mockDb.select).toHaveBeenCalledTimes(1)

			vi.advanceTimersByTime(30000)
			await Promise.resolve()
			expect(mockDb.select).toHaveBeenCalledTimes(1)

			resolvePoll!([])
			await Promise.resolve()
			await Promise.resolve()
			vi.advanceTimersByTime(3000)
			await Promise.resolve()
			expect(mockDb.select).toHaveBeenCalledTimes(2)
		} finally {
			await response.body?.cancel()
			vi.useRealTimers()
		}
	})
})
