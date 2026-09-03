import { describe, expect, it } from 'vitest'
import { createTokenPair } from '#app/utils/jwt.server.ts'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action } from './auth.refresh.ts'

describe('api/auth/refresh integration', () => {
	it('returns 400 when refreshToken or userId is missing', async () => {
		const request = new Request('http://localhost:3000/api/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('invalid_request')
	})

	it('returns 401 when user does not exist', async () => {
		const request = new Request('http://localhost:3000/api/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				refreshToken: 'fake-refresh-token',
				userId: 'non-existent-user-id',
			}),
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(401)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('user_not_found')
	})

	it('returns 200 with rotated tokens on valid refresh request', async () => {
		const user = await createTestUser()
		const tokens = await createTokenPair(
			{
				id: user.id,
				email: user.email,
				username: user.username,
			},
			{ userAgent: 'test-agent', ip: '127.0.0.1' },
		)

		const request = new Request('http://localhost:3000/api/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				refreshToken: tokens.refreshToken,
				userId: user.id,
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
		expect(body.data.accessToken).toBeDefined()
		expect(body.data.refreshToken).toBeDefined()
		// Rotated refresh token should be distinct from the old one
		expect(body.data.refreshToken).not.toBe(tokens.refreshToken)
	})

	it('returns 401 when refresh token is invalid or already used', async () => {
		const user = await createTestUser()

		const request = new Request('http://localhost:3000/api/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				refreshToken: 'invalid_corrupted_token',
				userId: user.id,
			}),
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(401)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('invalid_refresh_token')
	})

	it('returns 405 on GET request', async () => {
		const { loader } = await import('./auth.refresh.ts')
		const response = await loader()
		expect(getResponseStatus(response)).toBe(405)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('method_not_allowed')
	})
})
