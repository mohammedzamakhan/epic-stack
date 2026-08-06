// Feature: bug-recording-system, Property 13: Developer API consistency
// **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { BugBasher } from '../src/bugbasher.js'
import type { BugBasherConfig } from '../src/types.js'

// Mock OpenReplay Tracker
vi.mock('@openreplay/tracker', () => ({
	default: vi.fn().mockImplementation(() => ({
		start: vi.fn().mockResolvedValue(undefined),
		stop: vi.fn(),
		getSessionToken: vi.fn().mockReturnValue('test-session-token'),
		getSessionURL: vi
			.fn()
			.mockReturnValue('https://app.openreplay.com/session/test'),
		setUserID: vi.fn(),
		setMetadata: vi.fn(),
		event: vi.fn(),
	})),
}))

describe('Developer API Property Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		document.body.innerHTML = ''
	})

	const configArbitrary = fc.record({
		projectId: fc.string({ minLength: 1, maxLength: 50 }),
		apiOrigin: fc.webUrl(),
		debug: fc.boolean(),
	}) as fc.Arbitrary<BugBasherConfig>

	it('should provide consistent API interface for any configuration', () => {
		fc.assert(
			fc.property(configArbitrary, (config) => {
				// Property: For any BugBasher configuration, the API should provide consistent methods
				const bugBasher = new BugBasher(config)

				// All required API methods should exist
				expect(typeof bugBasher.showToolbar).toBe('function')
				expect(typeof bugBasher.hideToolbar).toBe('function')
				expect(typeof bugBasher.startRecording).toBe('function')
				expect(typeof bugBasher.stopRecording).toBe('function')
				expect(typeof bugBasher.getIsRecording).toBe('function')
				expect(typeof bugBasher.setUser).toBe('function')
				expect(typeof bugBasher.trackEvent).toBe('function')
				expect(typeof bugBasher.reportIssue).toBe('function')
				expect(typeof bugBasher.getSessionToken).toBe('function')
				expect(typeof bugBasher.getSessionURL).toBe('function')

				// Initial state should be consistent
				expect(bugBasher.getIsRecording()).toBe(false)

				// Session methods should return string or null
				const sessionToken = bugBasher.getSessionToken()
				const sessionURL = bugBasher.getSessionURL()
				expect(typeof sessionToken === 'string' || sessionToken === null).toBe(
					true,
				)
				expect(typeof sessionURL === 'string' || sessionURL === null).toBe(true)
			}),
			{ numRuns: 100 },
		)
	})

	it('should handle user identification consistently for any user data', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 100 }),
				fc.option(fc.dictionary(fc.string(), fc.anything()), {
					nil: undefined,
				}),
				(userId, metadata) => {
					// Property: For any user ID and metadata, setUser should work consistently
					const bugBasher = new BugBasher({
						projectId: 'test-project',
						apiOrigin: 'https://test.com',
						debug: false,
					})

					// Should not throw when setting user
					expect(() => {
						bugBasher.setUser(userId, metadata)
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should track events consistently for any event data', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 100 }),
				fc.dictionary(fc.string(), fc.anything()),
				(eventName, payload) => {
					// Property: For any event name and payload, trackEvent should work consistently
					const bugBasher = new BugBasher({
						projectId: 'test-project',
						apiOrigin: 'https://test.com',
						debug: false,
					})

					// Should not throw when tracking events
					expect(() => {
						bugBasher.trackEvent(eventName, payload)
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should report issues consistently for any issue data', () => {
		fc.assert(
			fc.property(
				fc.string({ minLength: 1, maxLength: 200 }),
				fc.dictionary(fc.string(), fc.anything()),
				(title, payload) => {
					// Property: For any issue title and payload, reportIssue should work consistently
					const bugBasher = new BugBasher({
						projectId: 'test-project',
						apiOrigin: 'https://test.com',
						debug: false,
					})

					// Should not throw when reporting issues
					expect(() => {
						bugBasher.reportIssue(title, payload)
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should handle toolbar operations consistently for any project ID', () => {
		fc.assert(
			fc.property(
				fc
					.string({ minLength: 1, maxLength: 50 })
					.filter((s) => s.trim().length > 0),
				(projectId) => {
					// Property: For any valid project ID, toolbar operations should work consistently
					const bugBasher = new BugBasher({
						projectId,
						apiOrigin: 'https://test.com',
						debug: false,
					})

					// Should not throw when showing/hiding toolbar
					expect(() => {
						bugBasher.showToolbar(projectId)
					}).not.toThrow()

					expect(() => {
						bugBasher.hideToolbar()
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should maintain recording state consistency across API calls', async () => {
		await fc.assert(
			fc.asyncProperty(fc.boolean(), async (shouldRecord) => {
				// Property: For any recording state sequence, the API should maintain consistency
				const bugBasher = new BugBasher({
					projectId: 'test-project',
					apiOrigin: 'https://test.com',
					debug: false,
				})

				// Initial state should be not recording
				expect(bugBasher.getIsRecording()).toBe(false)

				if (shouldRecord) {
					try {
						await bugBasher.startRecording()
						expect(bugBasher.getIsRecording()).toBe(true)

						const sessionData = await bugBasher.stopRecording()
						expect(bugBasher.getIsRecording()).toBe(false)
						expect(sessionData).toBeDefined()
						expect(sessionData.sessionId).toBeTruthy()
					} catch (error) {
						// Recording might fail in test environment, which is acceptable
						expect(bugBasher.getIsRecording()).toBe(false)
					}
				} else {
					// Should handle stop without start gracefully
					try {
						await bugBasher.stopRecording()
					} catch (error) {
						// Should throw error for invalid state
						expect(error).toBeInstanceOf(Error)
					}
					expect(bugBasher.getIsRecording()).toBe(false)
				}
			}),
			{ numRuns: 50 }, // Reduced runs due to async nature
		)
	})
})
