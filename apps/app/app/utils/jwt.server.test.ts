import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
	process.env.SESSION_SECRET = 'test-session-secret'
	process.env.JWT_SECRET = 'test-jwt-secret-key'
	process.env.DATABASE_URL = 'file:./data.db'
})

import { requireAuth, createAccessToken } from './jwt.server.ts'
import { canUserLogin } from '@repo/auth'

vi.mock('@repo/auth', () => ({
	canUserLogin: vi.fn(),
}))

describe('jwt.server.ts ban check (WO-85)', () => {
	const mockCanUserLogin = vi.mocked(canUserLogin)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('rejects request with valid access token if user is banned (canUserLogin returns false)', async () => {
		mockCanUserLogin.mockResolvedValue(false)

		const token = createAccessToken({
			sub: 'banned-user-123',
			email: 'banned@example.com',
			username: 'banneduser',
		})

		const request = new Request('http://localhost:3000/api/profile', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		await expect(requireAuth(request)).rejects.toThrow(
			'User account is disabled or banned',
		)
		expect(mockCanUserLogin).toHaveBeenCalledWith('banned-user-123')
	})

	it('returns payload when user is active and token is valid', async () => {
		mockCanUserLogin.mockResolvedValue(true)

		const token = createAccessToken({
			sub: 'active-user-123',
			email: 'active@example.com',
			username: 'activeuser',
		})

		const request = new Request('http://localhost:3000/api/profile', {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		const payload = await requireAuth(request)

		expect(payload.sub).toBe('active-user-123')
		expect(payload.email).toBe('active@example.com')
	})
})
