import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import jwt from 'jsonwebtoken'
import { action } from './i'

// Mock the OpenReplay server utilities
vi.mock('#app/utils/openreplay.server.ts', () => ({
	verifySessionToken: (token: string) => {
		// Use the same JWT verification logic as the real function
		const decoded = jwt.verify(token, 'test-secret-key-for-jwt-signing') as any
		return {
			sessionId: decoded.sessionId,
			sessionHash: decoded.sessionHash,
			projectKey: decoded.projectKey,
			userUUID: decoded.userUUID,
			metadata: decoded.metadata,
			startTime: decoded.timestamp,
		}
	},
	storeOpenReplaySessionData: vi.fn().mockResolvedValue(undefined),
}))

// Mock environment variables
beforeEach(() => {
	vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-jwt-signing')
})

describe('OpenReplay Data Ingestion API - Property Tests', () => {
	// Helper to create valid JWT tokens
	const createValidToken = (sessionData: any) => {
		return jwt.sign(sessionData, 'test-secret-key-for-jwt-signing', {
			expiresIn: '24h',
			issuer: 'bugbasher-openreplay',
		})
	}

	// Helper to encode variable-length unsigned integer (OpenReplay format)
	const encodeUint = (value: number): Uint8Array => {
		const bytes: number[] = []
		while (value >= 0x80) {
			bytes.push((value & 0x7f) | 0x80)
			value >>>= 7
		}
		bytes.push(value & 0x7f)
		return new Uint8Array(bytes)
	}

	// Helper to encode string (OpenReplay format)
	const encodeString = (str: string): Uint8Array => {
		const strBytes = new TextEncoder().encode(str)
		const lengthBytes = encodeUint(strBytes.length)
		const result = new Uint8Array(lengthBytes.length + strBytes.length)
		result.set(lengthBytes, 0)
		result.set(strBytes, lengthBytes.length)
		return result
	}

	// Helper to create OpenReplay BatchMetadata message (type 81)
	const createBatchMetadata = (): Uint8Array => {
		const parts: Uint8Array[] = []

		// Message type 81 (BatchMetadata)
		parts.push(encodeUint(81))

		// BatchMetadata fields: [version, pageNo, firstIndex, timestamp, location]
		parts.push(encodeUint(1)) // version
		parts.push(encodeUint(0)) // pageNo
		parts.push(encodeUint(0)) // firstIndex

		// Encode timestamp as signed int (zigzag encoding)
		const timestamp = Date.now()
		const zigzag = (timestamp << 1) ^ (timestamp >> 31)
		parts.push(encodeUint(zigzag))

		parts.push(encodeString('http://localhost:3000')) // location

		// Combine all parts
		const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
		const result = new Uint8Array(totalLength)
		let offset = 0
		for (const part of parts) {
			result.set(part, offset)
			offset += part.length
		}

		return result
	}

	// Helper to create OpenReplay ConsoleLog message (type 22)
	const createConsoleLogMessage = (
		level: string,
		message: string,
	): Uint8Array => {
		const parts: Uint8Array[] = []

		// Message type 22 (ConsoleLog)
		parts.push(encodeUint(22))

		// Calculate message size
		const levelBytes = encodeString(level)
		const messageBytes = encodeString(message)
		const messageSize = levelBytes.length + messageBytes.length

		// 3-byte little-endian size
		const sizeBytes = new Uint8Array(3)
		sizeBytes[0] = messageSize & 0xff
		sizeBytes[1] = (messageSize >> 8) & 0xff
		sizeBytes[2] = (messageSize >> 16) & 0xff
		parts.push(sizeBytes)

		// ConsoleLog fields: [level, value]
		parts.push(levelBytes)
		parts.push(messageBytes)

		// Combine all parts
		const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
		const result = new Uint8Array(totalLength)
		let offset = 0
		for (const part of parts) {
			result.set(part, offset)
			offset += part.length
		}

		return result
	}

	// Helper to create OpenReplay MouseClick message (type 68)
	const createMouseClickMessage = (
		elementId: number,
		selector: string,
	): Uint8Array => {
		const parts: Uint8Array[] = []

		// Message type 68 (MouseClick)
		parts.push(encodeUint(68))

		// Calculate message size
		const elementIdBytes = encodeUint(elementId)
		const hesitationTimeBytes = encodeUint(0)
		const labelBytes = encodeString('')
		const selectorBytes = encodeString(selector)
		const normalizedXBytes = encodeUint(50)
		const normalizedYBytes = encodeUint(100)

		const messageSize =
			elementIdBytes.length +
			hesitationTimeBytes.length +
			labelBytes.length +
			selectorBytes.length +
			normalizedXBytes.length +
			normalizedYBytes.length

		// 3-byte little-endian size
		const sizeBytes = new Uint8Array(3)
		sizeBytes[0] = messageSize & 0xff
		sizeBytes[1] = (messageSize >> 8) & 0xff
		sizeBytes[2] = (messageSize >> 16) & 0xff
		parts.push(sizeBytes)

		// MouseClick fields: [id, hesitationTime, label, selector, normalizedX, normalizedY]
		parts.push(elementIdBytes)
		parts.push(hesitationTimeBytes)
		parts.push(labelBytes)
		parts.push(selectorBytes)
		parts.push(normalizedXBytes)
		parts.push(normalizedYBytes)

		// Combine all parts
		const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
		const result = new Uint8Array(totalLength)
		let offset = 0
		for (const part of parts) {
			result.set(part, offset)
			offset += part.length
		}

		return result
	}

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should consistently process valid session tokens and binary data', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid session data
				fc.record({
					sessionId: fc.string({ minLength: 10, maxLength: 50 }),
					sessionHash: fc.string({ minLength: 10, maxLength: 50 }),
					projectKey: fc.string({ minLength: 1, maxLength: 100 }),
					timestamp: fc.integer({
						min: Date.now() - 86400000,
						max: Date.now() + 86400000,
					}),
				}),
				async (sessionData) => {
					// Mock console.log to prevent test output noise
					const consoleLogSpy = vi
						.spyOn(console, 'log')
						.mockImplementation(() => {})

					const token = createValidToken(sessionData)

					// Create valid OpenReplay binary payload
					const batchMetadata = createBatchMetadata()
					const consoleLog = createConsoleLogMessage('info', 'Test message')
					const mouseClick = createMouseClickMessage(123, '.test-button')

					const totalLength =
						batchMetadata.length + consoleLog.length + mouseClick.length
					const binaryData = new Uint8Array(totalLength)
					let offset = 0

					binaryData.set(batchMetadata, offset)
					offset += batchMetadata.length
					binaryData.set(consoleLog, offset)
					offset += consoleLog.length
					binaryData.set(mouseClick, offset)

					const request = new Request(
						'http://localhost:3000/api/openreplay/v1/web/i',
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token}`,
								'Content-Type': 'application/octet-stream',
							},
							body: binaryData,
						},
					)

					const response = await action({ request } as any)

					// Property: All valid tokens and data should be accepted
					expect(response.status).toBe(200)
					const responseData = await response.json()
					expect(responseData).toEqual({ success: true })

					consoleLogSpy.mockRestore()
				},
			),
			{ numRuns: 50 },
		)
	})

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should consistently reject invalid or expired tokens', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate invalid tokens
				fc.oneof(
					// Malformed tokens
					fc
						.string({ minLength: 1, maxLength: 100 })
						.filter((s) => !s.includes('.')),
					// Invalid JWT structure
					fc
						.string({ minLength: 10, maxLength: 200 })
						.map((s) => s + '.invalid.token'),
					// Expired tokens
					fc.constant('expired'),
				),
				async (tokenType) => {
					let token: string

					if (tokenType === 'expired') {
						// Create expired token
						token = jwt.sign(
							{
								sessionId: 'test-session',
								sessionHash: 'test-hash',
								projectKey: 'test-project',
								timestamp: Date.now(),
							},
							'test-secret-key-for-jwt-signing',
							{
								expiresIn: '-1h', // Expired 1 hour ago
								issuer: 'bugbasher-openreplay',
							},
						)
					} else {
						// Use malformed token
						token = tokenType
					}

					// Create valid binary data
					const binaryData = createBatchMetadata()

					const request = new Request(
						'http://localhost:3000/api/openreplay/v1/web/i',
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token}`,
								'Content-Type': 'application/octet-stream',
							},
							body: binaryData,
						},
					)

					const response = await action({ request } as any)

					// Property: All invalid tokens should be rejected with 401
					expect(response.status).toBe(401)
				},
			),
			{ numRuns: 30 },
		)
	})

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should consistently decode and filter OpenReplay message types', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid session data
				fc.record({
					sessionId: fc.string({ minLength: 10, maxLength: 50 }),
					sessionHash: fc.string({ minLength: 10, maxLength: 50 }),
					projectKey: fc.string({ minLength: 1, maxLength: 100 }),
					timestamp: fc.integer({
						min: Date.now() - 86400000,
						max: Date.now() + 86400000,
					}),
				}),
				// Generate message content
				fc.record({
					consoleLevel: fc.oneof(
						fc.constant('info'),
						fc.constant('warn'),
						fc.constant('error'),
					),
					consoleMessage: fc.string({ minLength: 1, maxLength: 200 }),
					elementId: fc.integer({ min: 1, max: 10000 }),
					selector: fc.string({ minLength: 1, maxLength: 100 }),
				}),
				async (sessionData, messageData) => {
					// Mock console.log to capture filtered messages
					const loggedMessages: any[] = []
					const consoleLogSpy = vi
						.spyOn(console, 'log')
						.mockImplementation((...args) => {
							loggedMessages.push(args)
						})

					const token = createValidToken(sessionData)

					// Create OpenReplay binary payload with relevant message types
					const batchMetadata = createBatchMetadata()
					const consoleLog = createConsoleLogMessage(
						messageData.consoleLevel,
						messageData.consoleMessage,
					)
					const mouseClick = createMouseClickMessage(
						messageData.elementId,
						messageData.selector,
					)

					const totalLength =
						batchMetadata.length + consoleLog.length + mouseClick.length
					const binaryData = new Uint8Array(totalLength)
					let offset = 0

					binaryData.set(batchMetadata, offset)
					offset += batchMetadata.length
					binaryData.set(consoleLog, offset)
					offset += consoleLog.length
					binaryData.set(mouseClick, offset)

					const request = new Request(
						'http://localhost:3000/api/openreplay/v1/web/i',
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token}`,
								'Content-Type': 'application/octet-stream',
							},
							body: binaryData,
						},
					)

					const response = await action({ request } as any)

					// Property: Request should be processed successfully
					expect(response.status).toBe(200)
					const responseData = await response.json()
					expect(responseData).toEqual({ success: true })

					// Property: Should have logged processing info
					expect(loggedMessages.length).toBeGreaterThanOrEqual(1)

					consoleLogSpy.mockRestore()
				},
			),
			{ numRuns: 30 },
		)
	})

	// Feature: bug-recording-system, Property 3: OpenReplay integration consistency
	it('should handle malformed binary data gracefully', async () => {
		await fc.assert(
			fc.asyncProperty(
				// Generate valid session data
				fc.record({
					sessionId: fc.string({ minLength: 10, maxLength: 50 }),
					sessionHash: fc.string({ minLength: 10, maxLength: 50 }),
					projectKey: fc.string({ minLength: 1, maxLength: 100 }),
					timestamp: fc.integer({
						min: Date.now() - 86400000,
						max: Date.now() + 86400000,
					}),
				}),
				// Generate malformed binary data
				fc.oneof(
					// Empty data
					fc.constant(new Uint8Array(0)),
					// Too short for any message
					fc.uint8Array({ minLength: 1, maxLength: 5 }),
					// Random binary data that doesn't follow OpenReplay format
					fc.uint8Array({ minLength: 10, maxLength: 100 }),
				),
				async (sessionData, malformedData) => {
					// Mock console.log and console.error to prevent test output noise
					const consoleLogSpy = vi
						.spyOn(console, 'log')
						.mockImplementation(() => {})
					const consoleErrorSpy = vi
						.spyOn(console, 'error')
						.mockImplementation(() => {})

					const token = createValidToken(sessionData)

					const request = new Request(
						'http://localhost:3000/api/openreplay/v1/web/i',
						{
							method: 'POST',
							headers: {
								Authorization: `Bearer ${token}`,
								'Content-Type': 'application/octet-stream',
							},
							body: malformedData,
						},
					)

					const response = await action({ request } as any)

					// Property: Malformed data should not crash the server
					expect(response.status).toBe(200)
					const responseData = await response.json()
					expect(responseData).toEqual({ success: true })

					consoleLogSpy.mockRestore()
					consoleErrorSpy.mockRestore()
				},
			),
			{ numRuns: 30 },
		)
	})
})
