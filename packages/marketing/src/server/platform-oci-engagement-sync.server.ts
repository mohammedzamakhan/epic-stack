import { db, eq, PlatformMarketingMessage } from '@repo/database'
import {
	fetchOciEngagementEvents,
	isOciEngagementLoggingConfigured,
} from '@repo/email'
import { getPlatformResendEngagementUpdates } from './platform-resend-webhook.server.ts'

export type PlatformEmailEngagementSyncResult = {
	synced: boolean
	reason?: string
	eventsFetched: number
	eventsApplied: number
}

const SYNC_THROTTLE_MS = 2 * 60 * 1000
let lastSyncedAt = 0

export function resetPlatformEmailEngagementSyncThrottle() {
	lastSyncedAt = 0
}

function shouldThrottleSync(force: boolean) {
	if (force) return false
	if (!lastSyncedAt) return false
	return Date.now() - lastSyncedAt < SYNC_THROTTLE_MS
}

export async function syncPlatformEmailEngagement(options?: {
	lookbackHours?: number
	force?: boolean
}): Promise<PlatformEmailEngagementSyncResult> {
	if (!isOciEngagementLoggingConfigured()) {
		return {
			synced: false,
			reason: 'oci_engagement_logging_not_configured',
			eventsFetched: 0,
			eventsApplied: 0,
		}
	}

	if (shouldThrottleSync(Boolean(options?.force))) {
		return {
			synced: false,
			reason: 'throttled',
			eventsFetched: 0,
			eventsApplied: 0,
		}
	}

	const events = await fetchOciEngagementEvents({
		lookbackHours: options?.lookbackHours ?? 48,
	})

	let eventsApplied = 0
	for (const event of events) {
		const [existing] = await db
			.select()
			.from(PlatformMarketingMessage)
			.where(eq(PlatformMarketingMessage.id, event.messageId))

		if (!existing) continue

		const updates = getPlatformResendEngagementUpdates(
			existing,
			event.action,
			event.occurredAt,
		)
		if (Object.keys(updates).length === 0) continue

		await db
			.update(PlatformMarketingMessage)
			.set(updates)
			.where(eq(PlatformMarketingMessage.id, existing.id))
		eventsApplied++
	}

	lastSyncedAt = Date.now()

	return {
		synced: true,
		eventsFetched: events.length,
		eventsApplied,
	}
}

export async function ensurePlatformEmailEngagementSynced(options?: {
	force?: boolean
}) {
	await syncPlatformEmailEngagement(options)
}
