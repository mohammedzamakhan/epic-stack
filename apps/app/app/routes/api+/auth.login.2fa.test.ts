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

import { action } from './auth.login.2fa.ts'
import { prisma } from '@repo/database'
import { isCodeValid } from '#app/routes/_auth+/verify.server.tsx'
import { createAuthenticatedSessionResponse, verify2FAToken } from '#app/utils/jwt.server.ts'

vi.mock('@repo/database', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('@repo/security', () => ({
	checkHoneypot: vi.fn().mockResolvedValue(undefined),
	arcjet: {
		withRule: vi.fn().mockReturnThis(),
		protect: vi.fn().mockResolvedValue({
			isDenied: () => false,
			reason: {
				isBot: () => false,
				isRateLimit: () => false,
			},
		}),
	},
}))

vi.mock('@repo/audit', () => ({
	auditService: {
		logAuth: vi.fn().mockResolvedValue(undefined),
	},
	AuditAction: {
		USER_LOGIN: 'USER_LOGIN',
		USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
	},
}))

vi.mock('#app/routes/_auth+/verify.server.tsx', () => ({
	isCodeValid: vi.fn(),
}))

vi.mock('#app/utils/jwt.server.ts', () => ({
	createAuthenticatedSessionResponse: vi.fn(),
	verify2FAToken: vi.fn(),
}))

describe('auth.login.2fa API action (WO-82)', () => {
	const mockIsCodeValid = vi.mocked(isCodeValid)
	const mockCreateSession = vi.mocked(createAuthenticatedSessionResponse)

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			id: 'user-123',
		} as any)
	})

	it('returns error when 2FA code is invalid or expired (400)', async () => {
		const mockVerify2FAToken = vi.mocked(verify2FAToken)
		mockVerify2FAToken.mockReturnValue({ userId: 'user-123', sessionId: 'session-123' })
		mockIsCodeValid.mockResolvedValue(false)

		const formData = new FormData()
		formData.append('userId', 'user-123')
		formData.append('code', '999999')
		formData.append('loginToken', 'valid-login-token')

		const request = new Request('http://localhost:3000/api/auth/login/2fa', {
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
			error: 'invalid_code',
			message: 'Invalid or expired 2FA code',
		})
		expect(mockCreateSession).not.toHaveBeenCalled()
	})

	it('completes 2FA login and returns session tokens when code is valid (200)', async () => {
		const mockVerify2FAToken = vi.mocked(verify2FAToken)
		mockVerify2FAToken.mockReturnValue({ userId: 'user-123', sessionId: 'session-123' })
		mockIsCodeValid.mockResolvedValue(true)
		mockCreateSession.mockResolvedValue({
			success: true,
			data: {
				user: { id: 'user-123', email: 'test@example.com' },
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			},
		} as any)

		const formData = new FormData()
		formData.append('userId', 'user-123')
		formData.append('code', '123456')
		formData.append('loginToken', 'valid-login-token')

		const request = new Request('http://localhost:3000/api/auth/login/2fa', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as any
		const responseData = response.data ?? (await response.json())

		expect(responseData.success).toBe(true)
		expect(responseData.data.accessToken).toBe('access-token')
		expect(mockCreateSession).toHaveBeenCalledWith('user-123', request)
	})
})
