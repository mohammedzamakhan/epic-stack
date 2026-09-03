import { verifySessionStorage } from '@repo/auth'
import { db, eq, Password, Session } from '@repo/database'
import { describe, expect, it } from 'vitest'
import {
	createAuthenticatedRequest,
	createTestSession,
	createTestUser,
	getResponseStatus,
} from '#tests/test-utils.ts'
import { convertSetCookieToCookie } from '#tests/utils.ts'
import {
	action,
	loader,
	resetPasswordUsernameSessionKey,
} from './reset-password.tsx'

async function createResetPasswordCookie(username: string) {
	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(resetPasswordUsernameSessionKey, username)
	const cookieHeader = await verifySessionStorage.commitSession(verifySession)
	return convertSetCookieToCookie(cookieHeader)
}

describe('reset-password route integration', () => {
	describe('loader', () => {
		it('redirects to /login if verify session is missing', async () => {
			const request = new Request('http://localhost:3000/reset-password')

			try {
				await loader({
					request,
					params: {},
					context: {},
				} as any)
				expect.fail('Expected loader to redirect to login')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(302)
				expect(error.headers.get('Location')).toBe('/login')
			}
		})

		it('returns resetPasswordUsername when valid verify session cookie is present', async () => {
			const user = await createTestUser()
			const cookie = await createResetPasswordCookie(user.username)

			const request = createAuthenticatedRequest(
				'http://localhost:3000/reset-password',
				{},
				cookie,
			)

			const result = await loader({
				request,
				params: {},
				context: {},
			} as any)

			expect(result.resetPasswordUsername).toBe(user.username)
		})
	})

	describe('action', () => {
		it('returns 400 when password and confirmPassword do not match', async () => {
			const user = await createTestUser()
			const cookie = await createResetPasswordCookie(user.username)

			const formData = new FormData()
			formData.append('password', 'NewValidPassword123!')
			formData.append('confirmPassword', 'DifferentPassword456!')

			const request = createAuthenticatedRequest(
				'http://localhost:3000/reset-password',
				{ method: 'POST', body: formData },
				cookie,
			)

			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			expect(getResponseStatus(response)).toBe(400)
		})

		it('successfully resets password, purges active sessions, and redirects to /login', async () => {
			const user = await createTestUser({ password: 'OldPassword123!' })
			// Create an active session for the user
			const { session } = await createTestSession(user.id)

			// Verify session exists before reset
			const [sessionBefore] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session.id))
				.limit(1)
			expect(sessionBefore).toBeDefined()

			const cookie = await createResetPasswordCookie(user.username)
			const newPassword = 'NewSecretPassword123!'

			const formData = new FormData()
			formData.append('password', newPassword)
			formData.append('confirmPassword', newPassword)

			const request = createAuthenticatedRequest(
				'http://localhost:3000/reset-password',
				{ method: 'POST', body: formData },
				cookie,
			)

			const response = (await action({
				request,
				params: {},
				context: {},
			} as any)) as Response

			expect(response.status).toBe(302)
			expect(response.headers.get('Location')).toBe('/login')

			// Verify existing sessions were wiped from database
			const [sessionAfter] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session.id))
				.limit(1)
			expect(sessionAfter).toBeUndefined()

			// Verify password hash in Password table was updated
			const [passwordRow] = await db
				.select()
				.from(Password)
				.where(eq(Password.userId, user.id))
				.limit(1)
			expect(passwordRow?.hash).toBeDefined()

			// Verify user can now log in with the new password
			const { login } = await import('#app/utils/auth.server.ts')
			const newLoginSession = await login({
				username: user.username,
				password: newPassword,
			})
			expect(newLoginSession).toBeDefined()
			expect(newLoginSession?.userId).toBe(user.id)
		})
	})
})
