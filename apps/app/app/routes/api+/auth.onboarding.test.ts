import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
	process.env.SESSION_SECRET = 'test-session-secret'
	process.env.JWT_SECRET = 'test-jwt-secret-key'
	process.env.DATABASE_URL = 'file:./data.db'
	process.env.USE_S3_STORAGE = 'false'
	process.env.AWS_ENDPOINT_URL_S3 = 'http://localhost:9000'
	process.env.AWS_REGION = 'us-east-1'
	process.env.AWS_ACCESS_KEY_ID = 'test'
	process.env.AWS_SECRET_ACCESS_KEY = 'test'
	process.env.S3_BUCKET_NAME = 'test'
	process.env.BUCKET_NAME = 'test'
})

import { action } from './auth.onboarding.ts'
import { verifySessionStorage } from '@repo/auth'

vi.mock('@repo/auth', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@repo/auth')>()
	return {
		...actual,
		verifySessionStorage: {
			getSession: vi.fn(),
		},
		checkIsCommonPassword: vi.fn().mockResolvedValue(false),
	}
})

vi.mock('@repo/database', () => ({
	prisma: {
		user: {
			findUnique: vi.fn().mockResolvedValue(null),
		},
	},
}))

vi.mock('@repo/security', () => ({
	checkHoneypot: vi.fn().mockResolvedValue(undefined),
}))

describe('auth.onboarding API action (WO-86 Email Session Binding)', () => {
	const mockGetSession = vi.mocked(verifySessionStorage.getSession)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('rejects onboarding request when no verification session cookie is present (400)', async () => {
		mockGetSession.mockResolvedValue({
			get: () => undefined,
		} as any)

		const formData = new FormData()
		formData.append('email', 'attacker@example.com')
		formData.append('username', 'attacker123')
		formData.append('name', 'Attacker')
		formData.append('password', 'ValidPassword123!')
		formData.append('confirmPassword', 'ValidPassword123!')
		formData.append('agreeToTermsOfServiceAndPrivacyPolicy', 'true')

		const request = new Request('http://localhost:3000/api/auth/onboarding', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as any
		const responseData = response.data ?? (await response.json())

		expect(response.status ?? 400).toBe(400)
		expect(responseData).toEqual({
			success: false,
			error: 'no_verification_session',
			message:
				'No verification session found. Please start the signup process again.',
		})
	})
})
