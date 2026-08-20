#!/usr/bin/env node

/**
 * GDPR Data Subject Request Processor
 *
 * This script processes due erasure requests (GDPR Article 17 - Right to Erasure).
 * It should be run periodically (e.g., daily via cron) to execute scheduled deletions.
 *
 * Usage:
 *   node scripts/process-gdpr-requests.mjs
 *
 * Environment:
 *   DATABASE_URL - SQLite database connection string
 */

import {
	and,
	AuditLog,
	DataSubjectRequest,
	db,
	eq,
	lte,
	User,
} from '@repo/database'

const GDPR_DELETION_GRACE_PERIOD_DAYS = 7

async function processDueErasureRequests() {
	const now = new Date()

	console.log(
		`[GDPR] Starting erasure request processing at ${now.toISOString()}`,
	)

	const dueRequests = await db
		.select()
		.from(DataSubjectRequest)
		.where(
			and(
				eq(DataSubjectRequest.type, 'erasure'),
				eq(DataSubjectRequest.status, 'scheduled'),
				lte(DataSubjectRequest.scheduledFor, now),
			),
		)

	console.log(`[GDPR] Found ${dueRequests.length} due erasure request(s)`)

	const results = {
		processed: 0,
		failed: 0,
		errors: [],
	}

	for (const dsr of dueRequests) {
		console.log(`[GDPR] Processing request ${dsr.id} for user ${dsr.userId}`)

		try {
			await db
				.update(DataSubjectRequest)
				.set({
					status: 'processing',
					processedAt: new Date(),
				})
				.where(eq(DataSubjectRequest.id, dsr.id))

			await db.delete(User).where(eq(User.id, dsr.userId))

			await db
				.update(DataSubjectRequest)
				.set({
					status: 'completed',
					completedAt: new Date(),
					executedAt: new Date(),
				})
				.where(eq(DataSubjectRequest.id, dsr.id))

			await db.insert(AuditLog).values({
				action: 'data_deletion_completed',
				details: `User account deleted (GDPR Article 17). User ID: ${dsr.userId}`,
				severity: 'warning',
				resourceType: 'data_subject_request',
				resourceId: dsr.id,
				metadata: JSON.stringify({
					userId: dsr.userId,
					requestedAt: dsr.requestedAt.toISOString(),
					scheduledFor: dsr.scheduledFor?.toISOString(),
					gracePeriodDays: GDPR_DELETION_GRACE_PERIOD_DAYS,
				}),
			})

			console.log(`[GDPR] Successfully deleted user ${dsr.userId}`)
			results.processed++
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			console.error(
				`[GDPR] Failed to delete user ${dsr.userId}: ${errorMessage}`,
			)

			await db
				.update(DataSubjectRequest)
				.set({
					status: 'failed',
					failureReason: errorMessage,
				})
				.where(eq(DataSubjectRequest.id, dsr.id))

			await db.insert(AuditLog).values({
				action: 'data_deletion_failed',
				details: `Failed to delete user account: ${errorMessage}`,
				severity: 'error',
				resourceType: 'data_subject_request',
				resourceId: dsr.id,
				metadata: JSON.stringify({
					userId: dsr.userId,
					error: errorMessage,
				}),
			})

			results.failed++
			results.errors.push({
				requestId: dsr.id,
				userId: dsr.userId,
				error: errorMessage,
			})
		}
	}

	console.log(
		`[GDPR] Processing complete. Processed: ${results.processed}, Failed: ${results.failed}`,
	)

	return results
}

async function main() {
	try {
		const results = await processDueErasureRequests()

		if (results.errors.length > 0) {
			console.error('[GDPR] Errors occurred during processing:')
			for (const err of results.errors) {
				console.error(
					`  - Request ${err.requestId} (User ${err.userId}): ${err.error}`,
				)
			}
			process.exit(1)
		}

		process.exit(0)
	} catch (error) {
		console.error('[GDPR] Fatal error during processing:', error)
		process.exit(1)
	}
}

main()
