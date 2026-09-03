import { db, Verification } from '@repo/database'
import { describe, expect, it } from 'vitest'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action } from './auth.login.ts'

describe('api/auth/login integration', () => {
	it('returns 400 when missing username or password', async () => {
		const formData = new FormData()

		const request = new Request('http://localhost:3000/api/auth/login', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('authentication_failed')
	})

	it('returns 400 on invalid credentials', async () => {
		const user = await createTestUser({ password: 'CorrectPassword123!' })

		const formData = new FormData()
		formData.append('username', user.username)
		formData.append('password', 'WrongPassword123!')

		const request = new Request('http://localhost:3000/api/auth/login', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('authentication_failed')
	})

	it('returns 200 with tokens and user info on valid credentials', async () => {
		const password = 'ValidPassword123!'
		const user = await createTestUser({ password })

		const formData = new FormData()
		formData.append('username', user.username)
		formData.append('password', password)

		const request = new Request('http://localhost:3000/api/auth/login', {
			method: 'POST',
			body: formData,
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
		expect(body.data.user.id).toBe(user.id)
		expect(body.data.user.username).toBe(user.username)
	})

	it('requires 2FA when user has two-factor authentication enabled', async () => {
		const password = 'TwoFactorPass123!'
		const user = await createTestUser({ password })

		// Enable 2FA in Verification table
		await db.insert(Verification).values({
			type: '2fa',
			target: user.id,
			secret: 'two-factor-otp-secret',
			algorithm: 'SHA-1',
			digits: 6,
			period: 30,
			charSet: '0123456789',
			expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		})

		const formData = new FormData()
		formData.append('username', user.username)
		formData.append('password', password)

		const request = new Request('http://localhost:3000/api/auth/login', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('two_factor_required')
		expect(body.loginToken).toBeDefined()
		expect(body.userId).toBe(user.id)
	})
})
