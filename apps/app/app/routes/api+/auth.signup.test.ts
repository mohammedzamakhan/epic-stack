import type * as DatabaseModule from '@repo/database'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mockSelectResults, resetMockDb } from '#tests/setup/drizzle-mock.ts'
import { action } from './auth.signup.ts'

process.env.SESSION_SECRET = 'test-session-secret'
process.env.DATABASE_URL = 'file:./data.db'

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>()
	const { mockDb, drizzleTable, drizzleOperator } =
		await import('#tests/setup/drizzle-mock.ts')
	return {
		...actual,
		db: mockDb,
		User: drizzleTable,
		eq: drizzleOperator,
	}
})

vi.mock('@repo/security', () => ({
	checkHoneypot: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('#app/routes/_auth+/verify.server.tsx', () => ({
	prepareVerification: vi.fn().mockResolvedValue({
		verifyUrl: new URL(
			'http://localhost:3000/verify?code=123456&type=onboarding',
		),
		redirectTo: new URL('http://localhost:3000/verify'),
		otp: '123456',
	}),
}))

describe('auth.signup API action (WO-86 OTP Secret Response Omission)', () => {
	beforeEach(() => {
		resetMockDb()
		mockSelectResults([])
	})

	it('returns success response omitting verifyUrl and raw OTP code', async () => {
		const formData = new FormData()
		formData.append('email', 'testuser@example.com')

		const request = new Request('http://localhost:3000/api/auth/signup', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as any
		const responseData = response.data ?? (await response.json())

		expect(responseData).toEqual({
			success: true,
			data: {
				email: 'testuser@example.com',
				verificationRequired: true,
			},
		})
		expect(responseData.data).not.toHaveProperty('verifyUrl')
		expect(responseData.data).not.toHaveProperty('otp')
		expect(responseData.data).not.toHaveProperty('code')
	})
})
