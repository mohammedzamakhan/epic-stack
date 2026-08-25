import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockFetchOciEngagementEvents = vi.fn()
const mockIsOciEngagementLoggingConfigured = vi.fn()

vi.mock('@repo/database', () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
	eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
	PlatformMarketingMessage: {
		id: 'id',
	},
}))

vi.mock('@repo/email', () => ({
	fetchOciEngagementEvents: (...args: unknown[]) =>
		mockFetchOciEngagementEvents(...args),
	isOciEngagementLoggingConfigured: () =>
		mockIsOciEngagementLoggingConfigured(),
}))

import {
	resetPlatformEmailEngagementSyncThrottle,
	syncPlatformEmailEngagement,
} from './platform-oci-engagement-sync.server.ts'

function mockSelectResult(result: unknown) {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(result),
	}
	mockSelect.mockReturnValue(chain)
	return chain
}

function mockUpdateChain() {
	const chain = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(undefined),
	}
	mockUpdate.mockReturnValue(chain)
	return chain
}

describe('syncPlatformEmailEngagement', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		resetPlatformEmailEngagementSyncThrottle()
		mockIsOciEngagementLoggingConfigured.mockReturnValue(true)
	})

	it('returns early when OCI engagement logging is not configured', async () => {
		mockIsOciEngagementLoggingConfigured.mockReturnValue(false)

		const result = await syncPlatformEmailEngagement()

		expect(result).toEqual({
			synced: false,
			reason: 'oci_engagement_logging_not_configured',
			eventsFetched: 0,
			eventsApplied: 0,
		})
		expect(mockFetchOciEngagementEvents).not.toHaveBeenCalled()
	})

	it('applies open events to matching platform messages', async () => {
		mockFetchOciEngagementEvents.mockResolvedValue([
			{
				action: 'open',
				messageId: 'msg-1',
				orgId: null,
				occurredAt: new Date('2026-01-01T12:30:00.000Z'),
			},
		])
		mockSelectResult([
			{
				id: 'msg-1',
				status: 'Sent',
				openedAt: null,
				clickedAt: null,
			},
		])
		const updateChain = mockUpdateChain()

		const result = await syncPlatformEmailEngagement({ force: true })

		expect(result).toEqual({
			synced: true,
			eventsFetched: 1,
			eventsApplied: 1,
		})
		expect(updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'Opened',
				openedAt: new Date('2026-01-01T12:30:00.000Z'),
			}),
		)
	})

	it('throttles repeated sync calls', async () => {
		mockFetchOciEngagementEvents.mockResolvedValue([])
		mockSelectResult([])

		const first = await syncPlatformEmailEngagement({ force: true })
		const second = await syncPlatformEmailEngagement()

		expect(first.synced).toBe(true)
		expect(second).toEqual({
			synced: false,
			reason: 'throttled',
			eventsFetched: 0,
			eventsApplied: 0,
		})
		expect(mockFetchOciEngagementEvents).toHaveBeenCalledTimes(1)
	})
})
