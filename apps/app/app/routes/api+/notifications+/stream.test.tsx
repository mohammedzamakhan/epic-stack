import { db } from '@repo/database'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loader } from './stream.tsx'

vi.mock('@repo/auth', () => ({
	requireUserId: vi.fn().mockResolvedValue('user1'),
}))

vi.mock('@repo/database', () => ({
	db: {
		organization: {
			findUnique: vi.fn().mockResolvedValue({ id: 'org1' }),
		},
	},
}))

describe('Notifications Stream API', () => {
	beforeEach(() => {
		vi.clearAllMocks()
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
		const request = new Request(
			'http://localhost/api/notifications/stream?orgSlug=acme',
		)
		await loader({ request, params: {} } as any)

		expect(db.organization.findUnique).toHaveBeenCalledWith({
			where: { slug: 'acme' },
			select: { id: true },
		})
	})
})
