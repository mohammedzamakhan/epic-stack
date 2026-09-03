import { db, eq, Session } from '@repo/database'
import { describe, expect, it } from 'vitest'
import {
	createAuthenticatedRequest,
	createTestSession,
	createTestUser,
} from '#tests/test-utils.ts'
import { action, loader } from './logout.tsx'

describe('logout route integration', () => {
	describe('loader', () => {
		it('redirects GET requests to /login', async () => {
			const response = await loader()
			expect(response.status).toBe(302)
			expect(response.headers.get('Location')).toBe('/login')
		})
	})

	describe('action', () => {
		it('logs out user, deletes session from DB, clears cookie, and redirects to /', async () => {
			const user = await createTestUser()
			const { session, cookie } = await createTestSession(user.id)

			// Verify session exists in DB before logout
			const [dbSessionBefore] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session.id))
				.limit(1)
			expect(dbSessionBefore).toBeDefined()

			const request = createAuthenticatedRequest(
				'http://localhost:3000/logout',
				{ method: 'POST' },
				cookie,
			)

			let response: Response
			try {
				await action({
					request,
					params: {},
					context: {},
				} as any)
				expect.fail('Expected action to throw redirect response')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				response = error
			}

			expect(response.status).toBe(302)
			expect(response.headers.get('Location')).toBe('/')

			// Verify cookie was cleared
			const setCookie = response.headers.get('set-cookie')
			expect(setCookie).toBeDefined()
			expect(setCookie).toContain('_session=;')

			// Allow background DB delete to settle
			await new Promise((resolve) => setTimeout(resolve, 50))

			// Verify session was removed from database
			const [dbSessionAfter] = await db
				.select()
				.from(Session)
				.where(eq(Session.id, session.id))
				.limit(1)
			expect(dbSessionAfter).toBeUndefined()
		})

		it('handles unauthenticated logout request gracefully', async () => {
			const request = new Request('http://localhost:3000/logout', {
				method: 'POST',
			})

			try {
				await action({
					request,
					params: {},
					context: {},
				} as any)
				expect.fail('Expected action to throw redirect response')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(302)
				expect(error.headers.get('Location')).toBe('/')
			}
		})
	})
})
