import { generateTOTP } from '@epic-web/totp'
import { db, eq, Verification } from '@repo/database'

import { describe, expect, it } from 'vitest'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action } from './verify.tsx'

describe('verify route integration', () => {
	it('returns 400 when required fields are missing', async () => {
		const formData = new FormData()

		const request = new Request('http://localhost:3000/verify', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
	})

	it('returns 400 on invalid or non-existent verification code', async () => {
		const user = await createTestUser()

		const formData = new FormData()
		formData.append('type', 'reset-password')
		formData.append('target', user.email.toLowerCase())
		formData.append('code', '000000')

		const request = new Request('http://localhost:3000/verify', {
			method: 'POST',
			body: formData,
		})

		const response = await action({
			request,
			params: {},
			context: {},
		} as any)

		expect(getResponseStatus(response)).toBe(400)
	})

	it('successfully verifies reset-password and redirects to /reset-password with session cookie', async () => {
		const user = await createTestUser()

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

		const request = new Request('http://localhost:3000/verify', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as Response

		expect(response.status).toBe(302)
		expect(response.headers.get('Location')).toContain('/reset-password')
		expect(response.headers.get('set-cookie')).toBeDefined()

		// Verify verification row was consumed/deleted
		const [verificationAfter] = await db
			.select()
			.from(Verification)
			.where(eq(Verification.target, user.email.toLowerCase()))
			.limit(1)

		expect(verificationAfter).toBeUndefined()
	})

	it('successfully verifies onboarding and redirects to /onboarding', async () => {
		const email = `onboarding_${Date.now()}@example.com`

		const secret = 'JBSWY3DPEHPK3PXP'
		const { otp } = await generateTOTP({
			secret,
			algorithm: 'SHA-1',
			period: 600,
			digits: 6,
		})

		await db.insert(Verification).values({
			type: 'onboarding',
			target: email.toLowerCase(),
			secret,
			algorithm: 'SHA-1',
			digits: 6,
			period: 600,
			charSet: '0123456789',
			expiresAt: new Date(Date.now() + 1000 * 60 * 10),
		})

		const formData = new FormData()
		formData.append('type', 'onboarding')
		formData.append('target', email.toLowerCase())
		formData.append('code', otp)

		const request = new Request('http://localhost:3000/verify', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as Response

		expect(response.status).toBe(302)
		expect(response.headers.get('Location')).toContain('/onboarding')
	})
})
