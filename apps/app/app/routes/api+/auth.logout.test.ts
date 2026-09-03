import { describe, expect, it } from 'vitest'
import { createTokenPair } from '#app/utils/jwt.server.ts'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action, loader } from './auth.logout.ts'

describe('api/auth/logout integration', () => {
	it('returns 405 on GET request', async () => {
		const response = await loader()
		expect(getResponseStatus(response)).toBe(405)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('method_not_allowed')
	})

	it('logs out and revokes refresh token successfully', async () => {
		const user = await createTestUser()
		const tokens = await createTokenPair(
			{
				id: user.id,
				email: user.email,
				username: user.username,
			},
			{ userAgent: 'test-agent', ip: '127.0.0.1' },
		)

		const request = new Request('http://localhost:3000/api/auth/logout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${tokens.accessToken}`,
			},
			body: JSON.stringify({
				refreshToken: tokens.refreshToken,
			}),
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(200)
		const body = (response as any).data
		expect(body.success).toBe(true)
		expect(body.data.message).toBe('Logged out successfully')
	})

	it('handles logout without refresh token gracefully', async () => {
		const request = new Request('http://localhost:3000/api/auth/logout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(200)
		const body = (response as any).data
		expect(body.success).toBe(true)
	})
})
