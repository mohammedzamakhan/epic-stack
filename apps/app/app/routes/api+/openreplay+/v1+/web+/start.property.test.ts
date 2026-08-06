import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import jwt from 'jsonwebtoken'
import { action } from './start'

// Mock environment variables
beforeEach(() => {
	vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-jwt-signing')
})

describe('OpenReplay Session Start API - Property Tests', () => {
	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should consistently initialize sessions for any valid project configuration', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid project configurations
				fc.record({
					projectKey: fc
						.string({ minLength: 1, maxLength: 100 })
						.filter((s) => s.trim().length > 0),
					userUUID: fc.option(fc.uuid(), { nil: undefined }),
					metadata: fc.option(
						fc.record({
							source: fc.constantFrom('toolbar', 'recorder', 'api'),
							version: fc.string({ minLength: 1, maxLength: 20 }),
							userAgent: fc.string({ minLength: 1, maxLength: 200 }),
							url: fc.webUrl(),
						}),
						{ nil: undefined },
					),
				}),
				async (config) => {
					const request = new Request(
						'http://localhost:3000/api/openreplay/v1/web/start',
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify(config),
						},
					)

					const response = await action({ request } as any)
					const data = (await response.json()) as {
						sessionToken: string
						sessionId: string
						sessionHash: string
						ingestPoint: string
						projectKey: string
						userUUID?: string
						metadata?: Record<string, any>
						token: string
						projectID: string
						beaconSizeLimit: number
						compressionThreshold: number
						startTime: number
						delay: number
						userBrowser: string
						userBrowserVersion: string
						userOS: string
						userOSVersion: string
						userDevice: string
						userDeviceName: string
						clientIP: string
						userCity: string | null
						userCountry: string | null
						userState: string | null
						canvasEnabled: boolean
						canvasQuality: number
						canvasFPS: number
						assistOnly: boolean
						config: Record<string, any>
					}

					// Property: All valid configurations should produce successful responses
					expect(response.status).toBe(200)

					// Property: Response should always contain required session fields
					expect(data).toHaveProperty('sessionToken')
					expect(data).toHaveProperty('sessionId')
					expect(data).toHaveProperty('sessionHash')
					expect(data).toHaveProperty('ingestPoint')

					// Property: Response should contain OpenReplay-specific fields
					expect(data).toHaveProperty('token')
					expect(data).toHaveProperty('projectID')
					expect(data).toHaveProperty('beaconSizeLimit')
					expect(data).toHaveProperty('compressionThreshold')
					expect(data).toHaveProperty('userCity')
					expect(data).toHaveProperty('userCountry')
					expect(data).toHaveProperty('userState')
					expect(data).toHaveProperty('canvasEnabled')
					expect(data).toHaveProperty('canvasQuality')
					expect(data).toHaveProperty('canvasFPS')
					expect(data).toHaveProperty('assistOnly')

					// Property: Session token should be a valid JWT
					expect(typeof data.sessionToken).toBe('string')
					expect(data.sessionToken.split('.')).toHaveLength(3) // JWT has 3 parts

					// Property: Token field should match sessionToken
					expect(data.token).toBe(data.sessionToken)

					// Property: ProjectID should match projectKey
					expect(data.projectID).toBe(config.projectKey)

					// Property: Session ID should be a non-empty string
					expect(typeof data.sessionId).toBe('string')
					expect(data.sessionId.length).toBeGreaterThan(0)

					// Property: Session hash should be a non-empty string
					expect(typeof data.sessionHash).toBe('string')
					expect(data.sessionHash.length).toBeGreaterThan(0)

					// Property: Ingest point should be a valid URL
					expect(typeof data.ingestPoint).toBe('string')
					expect(data.ingestPoint).toMatch(/^https?:\/\//)

					// Property: Numeric fields should have valid ranges
					expect(typeof data.beaconSizeLimit).toBe('number')
					expect(data.beaconSizeLimit).toBeGreaterThan(0)
					expect(typeof data.compressionThreshold).toBe('number')
					expect(data.compressionThreshold).toBeGreaterThan(0)
					expect(typeof data.canvasQuality).toBe('number')
					expect(data.canvasQuality).toBeGreaterThanOrEqual(0)
					expect(data.canvasQuality).toBeLessThanOrEqual(1)
					expect(typeof data.canvasFPS).toBe('number')
					expect(data.canvasFPS).toBeGreaterThan(0)

					// Property: Boolean fields should be boolean
					expect(typeof data.canvasEnabled).toBe('boolean')
					expect(typeof data.assistOnly).toBe('boolean')

					// Property: Input data should be preserved in response
					expect(data.projectKey).toBe(config.projectKey)
					if (config.userUUID) {
						expect(data.userUUID).toBe(config.userUUID)
					}
					if (config.metadata) {
						expect(data.metadata).toEqual(config.metadata)
					}

					// Property: JWT token should be decodable and contain session data
					const decoded = jwt.verify(
						data.sessionToken,
						'test-secret-key-for-jwt-signing',
					) as any
					expect(decoded).toHaveProperty('sessionId', data.sessionId)
					expect(decoded).toHaveProperty('sessionHash', data.sessionHash)
					expect(decoded).toHaveProperty('projectKey', config.projectKey)
					expect(decoded).toHaveProperty('timestamp')
					expect(decoded.iss).toBe('bugbasher-openreplay')
				},
			),
			{ numRuns: 100 },
		)
	})

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should consistently reject invalid project configurations', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate invalid project configurations
				fc.oneof(
					// Missing projectKey
					fc.record({
						userUUID: fc.option(fc.uuid(), { nil: undefined }),
						metadata: fc.option(fc.object(), { nil: undefined }),
					}),
					// Empty projectKey (only truly empty strings, not whitespace)
					fc.record({
						projectKey: fc.constant(''),
						userUUID: fc.option(fc.uuid(), { nil: undefined }),
						metadata: fc.option(fc.object(), { nil: undefined }),
					}),
				),
				async (invalidConfig) => {
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
							body: JSON.stringify(invalidConfig),
						},
					)

					const response = await action({ request } as any)
					const data = (await response.json()) as {
						error: string
						details?: any[]
					}

					// Property: All invalid configurations should be rejected
					expect(response.status).toBe(400)
					expect(data).toHaveProperty('error')
					expect(data.error).toBe('Invalid request data')

					consoleErrorSpy.mockRestore()
				},
			),
			{ numRuns: 100 },
		)
	})

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should generate unique session identifiers for concurrent requests', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate multiple valid project configurations
				fc.array(
					fc.record({
						projectKey: fc
							.string({ minLength: 1, maxLength: 100 })
							.filter((s) => s.trim().length > 0),
						userUUID: fc.option(fc.uuid(), { nil: undefined }),
						metadata: fc.option(fc.object(), { nil: undefined }),
					}),
					{ minLength: 2, maxLength: 10 },
				),
				async (configs) => {
					// Execute all requests concurrently
					const responses = await Promise.all(
						configs.map(async (config) => {
							const request = new Request(
								'http://localhost:3000/api/openreplay/v1/web/start',
								{
									method: 'POST',
									headers: {
										'Content-Type': 'application/json',
									},
									body: JSON.stringify(config),
								},
							)

							const response = await action({ request } as any)
							return response.json() as Promise<{
								sessionId: string
								sessionHash: string
								sessionToken: string
							}>
						}),
					)

					// Property: All session IDs should be unique
					const sessionIds = responses.map((data) => data.sessionId)
					const uniqueSessionIds = new Set(sessionIds)
					expect(uniqueSessionIds.size).toBe(sessionIds.length)

					// Property: All session hashes should be unique
					const sessionHashes = responses.map((data) => data.sessionHash)
					const uniqueSessionHashes = new Set(sessionHashes)
					expect(uniqueSessionHashes.size).toBe(sessionHashes.length)

					// Property: All JWT tokens should be unique
					const tokens = responses.map((data) => data.sessionToken)
					const uniqueTokens = new Set(tokens)
					expect(uniqueTokens.size).toBe(tokens.length)
				},
			),
			{ numRuns: 100 },
		)
	})
})
