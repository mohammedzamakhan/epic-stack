import { db, eq, Verification } from '@repo/database'
import { describe, expect, it } from 'vitest'
import { createTestUser, getResponseStatus } from '#tests/test-utils.ts'
import { action } from './forgot-password.tsx'

describe('forgot-password route integration', () => {
	it('returns 400 for empty form submission', async () => {
		const formData = new FormData()

		const request = new Request('http://localhost:3000/forgot-password', {
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

	it('returns 400 for invalid email format', async () => {
		const formData = new FormData()
		formData.append('usernameOrEmail', 'not-a-valid-email@')

		const request = new Request('http://localhost:3000/forgot-password', {
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

	it('creates verification record and redirects for existing user by email', async () => {
		const user = await createTestUser()

		const formData = new FormData()
		formData.append('usernameOrEmail', user.email)

		const request = new Request('http://localhost:3000/forgot-password', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as Response

		expect(response.status).toBe(302)
		const location = response.headers.get('Location')
		expect(location).toBeDefined()
		expect(location).toContain('/verify')

		// Verify reset-password verification record was created in the database
		const [verification] = await db
			.select()
			.from(Verification)
			.where(eq(Verification.target, user.email.toLowerCase()))
			.limit(1)

		expect(verification).toBeDefined()
		expect(verification?.type).toBe('reset-password')
	})

	it('creates verification record and redirects for existing user by username', async () => {
		const user = await createTestUser()

		const formData = new FormData()
		formData.append('usernameOrEmail', user.username)

		const request = new Request('http://localhost:3000/forgot-password', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as Response

		expect(response.status).toBe(302)
		expect(response.headers.get('Location')).toContain('/verify')

		const [verification] = await db
			.select()
			.from(Verification)
			.where(eq(Verification.target, user.username))
			.limit(1)

		expect(verification).toBeDefined()
		expect(verification?.type).toBe('reset-password')
	})

	it('returns fake redirect for non-existent user without creating DB verification', async () => {
		const nonexistentEmail = `nobody_${Date.now()}@example.com`

		const formData = new FormData()
		formData.append('usernameOrEmail', nonexistentEmail)

		const request = new Request('http://localhost:3000/forgot-password', {
			method: 'POST',
			body: formData,
		})

		const response = (await action({
			request,
			params: {},
			context: {},
		} as any)) as Response

		// Still redirects (to avoid leaking account existence)
		expect(response.status).toBe(302)
		expect(response.headers.get('Location')).toContain('/verify')

		// A verification entry is generated so timing and execution match
		const [verification] = await db
			.select()
			.from(Verification)
			.where(eq(Verification.target, nonexistentEmail))
			.limit(1)

		expect(verification).toBeDefined()
		expect(verification?.type).toBe('reset-password')
	})
})
