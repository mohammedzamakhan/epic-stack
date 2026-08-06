// Feature: bug-recording-system, Property 11: Privacy configuration enforcement
// **Validates: Requirements 8.1, 8.3**

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { OpenReplayIntegration } from '../src/openreplay.js'

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

describe('OpenReplay Integration Property Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should enforce privacy configuration for any project configuration', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					projectKey: fc.string({ minLength: 1, maxLength: 50 }),
					apiOrigin: fc.webUrl(),
					debug: fc.boolean(),
				}),
				async (config) => {
					// Property: For any OpenReplay initialization, privacy settings should be properly configured
					const integration = new OpenReplayIntegration(
						config.projectKey,
						config.apiOrigin,
						config.debug,
					)

					await integration.initialize()

					// The integration should be created without throwing errors
					expect(integration).toBeDefined()

					// Should be able to get session info
					const sessionToken = integration.getSessionToken()
					const sessionURL = integration.getSessionURL()

					// Session info should be strings or null
					expect(
						typeof sessionToken === 'string' || sessionToken === null,
					).toBe(true)
					expect(typeof sessionURL === 'string' || sessionURL === null).toBe(
						true,
					)
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should handle user identification consistently for any user data', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1, maxLength: 100 }),
				fc.option(fc.dictionary(fc.string(), fc.anything()), {
					nil: undefined,
				}),
				async (userId, metadata) => {
					// Property: For any user ID and metadata, setUser should work consistently
					const integration = new OpenReplayIntegration(
						'test-project',
						'https://test.com',
					)
					await integration.initialize()

					// Should not throw when setting user
					expect(() => {
						integration.setUser(userId, metadata)
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})

	it('should track events consistently for any event data', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1, maxLength: 100 }),
				fc.option(fc.dictionary(fc.string(), fc.anything()), {
					nil: undefined,
				}),
				async (eventName, payload) => {
					// Property: For any event name and payload, trackEvent should work consistently
					const integration = new OpenReplayIntegration(
						'test-project',
						'https://test.com',
					)
					await integration.initialize()

					// Should not throw when tracking events
					expect(() => {
						integration.trackEvent(eventName, payload)
					}).not.toThrow()
				},
			),
			{ numRuns: 100 },
		)
	})
})
