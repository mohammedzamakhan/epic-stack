import { describe, it, expect, beforeEach, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { action, loader } from './i'

// Mock the storeOpenReplaySessionData function
vi.mock('#app/utils/openreplay.server.ts', async () => {
	const actual = await vi.importActual('#app/utils/openreplay.server.ts')
	return {
		...actual,
		storeOpenReplaySessionData: vi.fn().mockResolvedValue(undefined),
	}
})

// Mock environment variables
beforeEach(() => {
	vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-jwt-signing')
})

describe('OpenReplay Data Ingestion API', () => {
	it('should handle OPTIONS request for CORS', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'OPTIONS',
			},
		)

		const response = await loader({ request })

		expect(response.status).toBe(204)
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
			'POST',
		)
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
			'OPTIONS',
		)
	})

	it('should reject non-POST requests in action', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'GET',
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(405)
	})

	it('should reject requests without Authorization header', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'POST',
				body: new ArrayBuffer(0),
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(401)
	})

	it('should reject requests with invalid token', async () => {
		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
				},
				body: new ArrayBuffer(0),
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(401)
	})

	it('should accept requests with valid token and binary data', async () => {
		// Mock console methods to prevent test output noise
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})
		const consoleWarnSpy = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => {})

		// Create a valid JWT token
		const sessionData = {
			sessionId: 'test-session-123',
			sessionHash: 'test-hash',
			projectKey: 'test-project',
			timestamp: Date.now(),
		}

		const token = jwt.sign(sessionData, 'test-secret-key-for-jwt-signing', {
			expiresIn: '24h',
			issuer: 'bugbasher-openreplay',
		})

		// Create proper OpenReplay binary data with BatchMetadata message (type 81)
		// BatchMetadata: [version, pageNo, firstIndex, timestamp, location]
		const binaryData = new Uint8Array([
			81, // Message type: BatchMetadata (first message has no size prefix)
			1, // version (uint)
			0, // pageNo (uint)
			0, // firstIndex (uint)
			128,
			195,
			6, // timestamp (uint) = 100000
			0, // location (string length = 0)
		])

		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: binaryData,
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(200)
		const responseData = await response.json()
		expect(responseData).toEqual({ success: true })

		consoleLogSpy.mockRestore()
		consoleErrorSpy.mockRestore()
		consoleWarnSpy.mockRestore()
	})

	it('should handle empty binary data gracefully', async () => {
		// Mock console methods to prevent test output noise
		const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const consoleErrorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		// Create a valid JWT token
		const sessionData = {
			sessionId: 'test-session-123',
			sessionHash: 'test-hash',
			projectKey: 'test-project',
			timestamp: Date.now(),
		}

		const token = jwt.sign(sessionData, 'test-secret-key-for-jwt-signing', {
			expiresIn: '24h',
			issuer: 'bugbasher-openreplay',
		})

		const request = new Request(
			'http://localhost:3000/api/openreplay/v1/web/i',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: new ArrayBuffer(0),
			},
		)

		const response = await action({ request } as any)

		expect(response.status).toBe(200)
		const responseData = await response.json()
		expect(responseData).toEqual({ success: true })

		consoleLogSpy.mockRestore()
		consoleErrorSpy.mockRestore()
	})
})
