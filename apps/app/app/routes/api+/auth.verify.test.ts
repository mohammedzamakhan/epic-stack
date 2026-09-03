import { generateTOTP } from '@epic-web/totp'
import { db, Verification } from '@repo/database'
import { describe, expect, it } from 'vitest'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action, loader } from './auth.verify.ts'

describe('api/auth/verify integration', () => {
	it('returns 405 on GET request', async () => {
		const response = await loader()
		expect(getResponseStatus(response)).toBe(405)
		const body = (response as any).data
		expect(body.success).toBe(false)
		expect(body.error).toBe('method_not_allowed')
	})

	it('returns error when verification code is invalid', async () => {
		const user = await createTestUser()

		const formData = new FormData()
		formData.append('type', 'reset-password')
		formData.append('target', user.email)
		formData.append('code', '999999')

		const request = new Request('http://localhost:3000/api/auth/verify', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		const status = getResponseStatus(response)
		expect([400, 200]).toContain(status)
		const body = (response as any).data
		// Either verification_failed or form error reply
		expect(body.data?.verified).not.toBe(true)
	})

	it('successfully verifies a valid reset-password OTP code', async () => {
		const user = await createTestUser()

		// Generate valid TOTP
		const secret = 'JBSWY3DPEHPK3PXP'
		const { otp } = await generateTOTP({
			secret,
			algorithm: 'SHA-1',
			period: 600,
			digits: 6,
		})

		await db.insert(Verification).values({
			type: 'reset-password',
			target: user.email.toLowerCase(),
			secret,
			algorithm: 'SHA-1',
			digits: 6,
			period: 600,
			charSet: '0123456789',
			expiresAt: new Date(Date.now() + 1000 * 60 * 10),
		})

		const formData = new FormData()
		formData.append('type', 'reset-password')
		formData.append('target', user.email.toLowerCase())
		formData.append('code', otp)

		const request = new Request('http://localhost:3000/api/auth/verify', {
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
		expect(body.data.verified).toBe(true)
		expect(body.data.redirectTo).toBeDefined()
	})
})
