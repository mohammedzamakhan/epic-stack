// Feature: bug-recording-system, Property 7: Session data round-trip consistency
// **Validates: Requirements 6.2, 6.3**

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { Communication } from '../src/communication.js'
import type { SessionData } from '../src/types.js'

describe('Session Data Property Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.clear()
	})

	const sessionDataArbitrary = fc.record({
		sessionId: fc
			.string({ minLength: 1, maxLength: 50 })
			.filter((s) => s.trim().length > 0)
			.filter((s) => /^[a-zA-Z0-9\-_]+$/.test(s.trim()))
			.map((s) => s.trim()), // Ensure we use the trimmed version consistently
		openReplaySessionId: fc.string({ minLength: 0, maxLength: 100 }),
		openReplaySessionHash: fc.string({ minLength: 0, maxLength: 100 }),
		videoData: fc.option(fc.string(), { nil: null }),
		duration: fc.integer({ min: 0, max: 3600 }),
		comments: fc.array(
			fc.record({
				element: fc.record({
					selector: fc.string({ minLength: 1, maxLength: 100 }),
					tagName: fc.string({ minLength: 1, maxLength: 20 }),
					text: fc.string({ minLength: 0, maxLength: 100 }),
				}),
				message: fc.string({ minLength: 1, maxLength: 500 }),
				screenshot: fc.string({ minLength: 1, maxLength: 1000 }),
				position: fc.record({
					x: fc.integer({ min: 0, max: 1920 }),
					y: fc.integer({ min: 0, max: 1080 }),
				}),
				timestamp: fc.integer({ min: 0, max: Date.now() }),
				relativeTime: fc.integer({ min: 0, max: 3600 }),
				url: fc.webUrl(),
			}),
			{ minLength: 0, maxLength: 5 },
		),
		url: fc.webUrl(),
		projectId: fc
			.string({ minLength: 1, maxLength: 50 })
			.filter((s) => s.trim().length > 0)
			.filter((s) => /^[a-zA-Z0-9\-_]+$/.test(s.trim()))
			.map((s) => s.trim()), // Ensure we use the trimmed version consistently
		userAgent: fc.string({ minLength: 1, maxLength: 200 }),
		recordingStartTime: fc.integer({ min: 0, max: Date.now() }),
		source: fc.constantFrom('toolbar', 'recorder'),
	}) as fc.Arbitrary<SessionData>

	it('should maintain session data integrity through round-trip storage', () => {
		fc.assert(
			fc.property(sessionDataArbitrary, (sessionData) => {
				// Property: For any session data, storing then retrieving should preserve data integrity
				const communication = new Communication('https://test.com')

				// Store session data
				communication.storeSessionData(sessionData.sessionId, sessionData)

				// Retrieve session data
				const retrievedData = communication.getSessionData(
					sessionData.sessionId,
				)

				// Data should be preserved
				expect(retrievedData).not.toBeNull()
				if (retrievedData) {
					expect(retrievedData.sessionId).toBe(sessionData.sessionId)
					expect(retrievedData.projectId).toBe(sessionData.projectId)
					expect(retrievedData.url).toBe(sessionData.url)
					expect(retrievedData.source).toBe(sessionData.source)
					expect(retrievedData.duration).toBe(sessionData.duration)
					expect(retrievedData.comments).toHaveLength(
						sessionData.comments.length,
					)
				}

				// Cleanup
				communication.clearSessionData(sessionData.sessionId)
				communication.destroy()
			}),
			{ numRuns: 100 },
		)
	})

	it('should handle session data clearing consistently for any session ID', () => {
		fc.assert(
			fc.property(
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter((s) => s.trim().length > 0)
					.filter((s) => /^[a-zA-Z0-9\-_]+$/.test(s.trim()))
					.map((s) => s.trim()), // Ensure we use the trimmed version consistently
				sessionDataArbitrary,
				(sessionId, sessionData) => {
					// Property: For any session ID, clearing should work consistently
					const communication = new Communication('https://test.com')

					// Store data
					communication.storeSessionData(sessionId, sessionData)
					expect(communication.getSessionData(sessionId)).not.toBeNull()

					// Clear data
					communication.clearSessionData(sessionId)
					expect(communication.getSessionData(sessionId)).toBeNull()

					communication.destroy()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should handle storage quota gracefully for any large session data', () => {
		fc.assert(
			fc.property(
				sessionDataArbitrary,
				fc.string({ minLength: 1000, maxLength: 10000 }), // Large video data
				(sessionData, largeVideoData) => {
					// Property: For any session data size, storage should handle quota limits gracefully
					const communication = new Communication('https://test.com')
					const largeSessionData = { ...sessionData, videoData: largeVideoData }

					// Mock localStorage quota exceeded
					const originalSetItem = localStorage.setItem

					localStorage.setItem = vi.fn().mockImplementation((key, value) => {
						if (value.length > 5000) {
							// Simulate quota limit
							const error = new Error('QuotaExceededError')
							error.name = 'QuotaExceededError'
							throw error
						}
						return originalSetItem.call(localStorage, key, value)
					})

					// Should handle storage gracefully
					expect(() => {
						communication.storeSessionData(
							largeSessionData.sessionId,
							largeSessionData,
						)
					}).not.toThrow()

					// Restore original implementation
					localStorage.setItem = originalSetItem
					communication.destroy()
				},
			),
			{ numRuns: 50 }, // Reduced runs due to complexity
		)
	})

	it('should maintain data consistency across multiple sessions', () => {
		fc.assert(
			fc.property(
				fc.array(sessionDataArbitrary, { minLength: 1, maxLength: 5 }),
				(sessionDataArray) => {
					// Property: For any collection of sessions with unique session IDs, each should maintain independent data integrity
					const communication = new Communication('https://test.com')

					// Ensure unique session IDs by deduplicating based on sessionId
					const uniqueSessions = new Map<string, SessionData>()
					for (const sessionData of sessionDataArray) {
						uniqueSessions.set(sessionData.sessionId, sessionData)
					}
					const uniqueSessionArray = Array.from(uniqueSessions.values())

					// Store all sessions
					for (const sessionData of uniqueSessionArray) {
						communication.storeSessionData(sessionData.sessionId, sessionData)
					}

					// Verify all sessions can be retrieved independently
					for (const originalData of uniqueSessionArray) {
						const retrievedData = communication.getSessionData(
							originalData.sessionId,
						)
						expect(retrievedData).not.toBeNull()
						if (retrievedData) {
							expect(retrievedData.sessionId).toBe(originalData.sessionId)
							expect(retrievedData.projectId).toBe(originalData.projectId)
						}
					}

					// Cleanup
					for (const sessionData of uniqueSessionArray) {
						communication.clearSessionData(sessionData.sessionId)
					}
					communication.destroy()
				},
			),
			{ numRuns: 50 },
		)
	})
})
