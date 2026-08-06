// Feature: bug-recording-system, Property 2: Recording workflow completeness
// **Validates: Requirements 1.2, 1.4, 2.3, 3.5, 6.1**

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { BugBasher } from '../src/bugbasher.js'

describe('Recording Delegation Property Tests', () => {
	// Mock window.open for testing
	const mockWindowOpen = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockWindowOpen.mockReturnValue({} as Window) // Mock successful window opening
		Object.defineProperty(window, 'open', {
			value: mockWindowOpen,
			writable: true,
		})
	})

	it('should delegate recording to recorder page consistently for any project configuration', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					projectId: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => s.trim().length > 0),
					apiOrigin: fc.webUrl(),
					debug: fc.boolean(),
				}),
				async (config) => {
					// Reset mock for this iteration
					mockWindowOpen.mockClear()

					// Property: For any valid project configuration, recording should delegate to recorder page
					const bugBasher = new BugBasher(config)

					// Should open recorder page when starting recording
					await bugBasher.startRecording()

					// Verify window.open was called with correct URL
					expect(mockWindowOpen).toHaveBeenCalledTimes(1)
					const [url, target, features] = mockWindowOpen.mock.calls[0]

					// URL should contain project ID and proper parameters
					expect(url).toContain(
						`/recorder/${encodeURIComponent(config.projectId)}`,
					)
					expect(url).toContain('source=toolbar')
					expect(url).toContain('autoStart=true')
					expect(url).toContain('sessionId=')
					expect(target).toBe('_blank')
					if (features) {
						expect(features).toContain('width=1200,height=800')
					}
				},
			),
			{ numRuns: 10 }, // Reduced runs for faster execution
		)
	}, 10000)

	it('should handle recording state transitions consistently with recorder page delegation', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					projectId: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => s.trim().length > 0),
					apiOrigin: fc.webUrl(),
				}),
				async (config) => {
					// Reset mock for this iteration
					mockWindowOpen.mockClear()

					// Property: For any configuration, recording state should be managed correctly
					const bugBasher = new BugBasher(config)

					// Initially not recording
					expect(bugBasher.getIsRecording()).toBe(false)

					// Should be able to start recording (opens recorder page)
					await bugBasher.startRecording()

					// Verify recorder page was opened
					expect(mockWindowOpen).toHaveBeenCalledTimes(1)

					// Should be able to stop recording (returns session data)
					// Note: In the new architecture, stopRecording doesn't require active recording
					// since recording is handled by the recorder page
					const sessionData = await bugBasher.stopRecording()

					// Session data should have required properties
					expect(sessionData).toHaveProperty('sessionId')
					expect(sessionData).toHaveProperty('projectId', config.projectId)
					expect(sessionData).toHaveProperty('source', 'toolbar')
					expect(sessionData).toHaveProperty('comments')
					expect(sessionData.videoData).toBeNull() // Video handled by recorder page
				},
			),
			{ numRuns: 10 },
		)
	}, 10000)

	it('should generate unique session IDs for concurrent recording requests', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					projectId: fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => s.trim().length > 0),
					apiOrigin: fc.webUrl(),
				}),
				async (config) => {
					// Reset mock for this iteration
					mockWindowOpen.mockClear()

					// Property: Each recording session should have a unique identifier
					const bugBasher1 = new BugBasher(config)
					const bugBasher2 = new BugBasher(config)

					// Start recording on both instances
					await bugBasher1.startRecording()
					await bugBasher2.startRecording()

					// Both should open recorder pages
					expect(mockWindowOpen).toHaveBeenCalledTimes(2)

					// Extract session IDs from URLs
					const url1 = mockWindowOpen.mock.calls[0][0]
					const url2 = mockWindowOpen.mock.calls[1][0]

					const sessionId1 = new URL(url1).searchParams.get('sessionId')
					const sessionId2 = new URL(url2).searchParams.get('sessionId')

					// Session IDs should be unique
					expect(sessionId1).not.toBe(sessionId2)
					expect(sessionId1).toMatch(/^bb_\d+_[a-z0-9]+$/)
					expect(sessionId2).toMatch(/^bb_\d+_[a-z0-9]+$/)
				},
			),
			{ numRuns: 5 }, // Reduced runs since this creates multiple instances
		)
	}, 10000)
})
