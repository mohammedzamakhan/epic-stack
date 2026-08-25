import { describe, expect, it } from 'vitest'
import { getPlatformResendEngagementUpdates } from './platform-resend-webhook.server.ts'

describe('getPlatformResendEngagementUpdates', () => {
	const baseMessage = {
		id: 'msg-1',
		campaignId: 'camp-1',
		userId: 'user-1',
		status: 'Sent',
		sentAt: new Date('2026-01-01T12:00:00.000Z'),
		openedAt: null,
		clickedAt: null,
		providerMessageId: 'resend-1',
		createdAt: new Date('2026-01-01T12:00:00.000Z'),
	}

	it('marks a sent message as opened', () => {
		const updates = getPlatformResendEngagementUpdates(
			baseMessage,
			'open',
			new Date('2026-01-01T12:30:00.000Z'),
		)

		expect(updates.status).toBe('Opened')
		expect(updates.openedAt?.toISOString()).toBe('2026-01-01T12:30:00.000Z')
	})

	it('marks a message as clicked and backfills openedAt', () => {
		const updates = getPlatformResendEngagementUpdates(
			baseMessage,
			'click',
			new Date('2026-01-01T12:45:00.000Z'),
		)

		expect(updates.status).toBe('Clicked')
		expect(updates.clickedAt?.toISOString()).toBe('2026-01-01T12:45:00.000Z')
		expect(updates.openedAt?.toISOString()).toBe('2026-01-01T12:45:00.000Z')
	})

	it('does not downgrade clicked messages on duplicate open events', () => {
		const clicked = {
			...baseMessage,
			status: 'Clicked',
			openedAt: new Date('2026-01-01T12:30:00.000Z'),
			clickedAt: new Date('2026-01-01T12:45:00.000Z'),
		}

		const updates = getPlatformResendEngagementUpdates(
			clicked,
			'open',
			new Date('2026-01-01T13:00:00.000Z'),
		)

		expect(updates).toEqual({})
	})
})
