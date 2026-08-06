import { describe, it, expect, beforeEach, vi } from 'vitest'
import { action, loader } from './start'

// Mock environment variables
beforeEach(() => {
	vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-jwt-signing')
})

describe('OpenReplay Session Start API', () => {
	it('should handle OPTIONS request for CORS', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/start',
			{
				method: 'OPTIONS',
			},
		)

		const response = await loader({ request })

		expect(response.status).toBe(200)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
			'POST, OPTIONS',
		)
	})

	it('should reject non-POST requests in action', async () => {
		// Mock console.error to prevent test failure
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/start',
			{
				method: 'GET',
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(405)

		consoleErrorSpy.mockRestore()
	})

	it('should create session with valid project key', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/start',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectKey: 'test-project-123',
					userUUID: 'user-456',
					metadata: { source: 'test' },
				}),
			},
		)

		const response = await action({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data).toHaveProperty('sessionToken')
		expect(data).toHaveProperty('sessionId')
		expect(data).toHaveProperty('sessionHash')
		expect(data).toHaveProperty('ingestPoint')
		expect(data.projectKey).toBe('test-project-123')
		expect(data.userUUID).toBe('user-456')
		expect(data.metadata).toEqual({ source: 'test' })
	})

	it('should reject invalid request data', async () => {
		// Mock console.error to prevent test failure
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/start',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					// Missing required projectKey
					userUUID: 'user-456',
				}),
			},
		)

		const response = await action({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(400)
		expect(data).toHaveProperty('error')
		expect(data.error).toBe('Invalid request data')

		consoleErrorSpy.mockRestore()
	})

	it('should handle malformed JSON', async () => {
		// Mock console.error to prevent test failure
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/start',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: 'invalid-json',
			},
		)

		const response = await action({ request } as any)
		const data = await response.json()

		expect(response.status).toBe(500)
		expect(data).toHaveProperty('error')

		consoleErrorSpy.mockRestore()
	})
})
