import { describe, expect, test } from 'vitest'
import {
	createSession,
	deleteSession,
	getSession,
} from './streamable-http.server.ts'

describe('deleteSession', () => {
	const user1 = { id: 'user-1' }
	const org1 = { id: 'org-1' }

	const user2 = { id: 'user-2' }
	const org2 = { id: 'org-2' }

	const tokenData1 = {
		user: user1,
		organization: org1,
		authorizationId: 'auth-1',
	}

	test('should delete session when ownership matches', () => {
		const { sessionId } = createSession(tokenData1)

		const deleted = deleteSession(sessionId, tokenData1)
		expect(deleted).toBe(true)

		const session = getSession(sessionId, tokenData1)
		expect(session).toBeNull()
	})

	test('should NOT delete session when user ID mismatch', () => {
		const { sessionId } = createSession(tokenData1)

		const deleted = deleteSession(sessionId, { ...tokenData1, user: user2 })
		expect(deleted).toBe(false)

		const session = getSession(sessionId, tokenData1)
		expect(session).not.toBeNull()
	})

	test('should NOT delete session when organization ID mismatch', () => {
		const { sessionId } = createSession(tokenData1)

		const deleted = deleteSession(sessionId, {
			...tokenData1,
			organization: org2,
		})
		expect(deleted).toBe(false)

		const session = getSession(sessionId, tokenData1)
		expect(session).not.toBeNull()
	})

	test('should return false for non-existent session', () => {
		const deleted = deleteSession('non-existent-session', tokenData1)
		expect(deleted).toBe(false)
	})
})
