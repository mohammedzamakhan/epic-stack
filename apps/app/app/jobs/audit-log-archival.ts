/**
 * Scheduled job to archive old audit logs
 *
 * This job runs daily to:
 * 1. Archive logs older than the hot storage period (move to cold storage)
 * 2. Delete logs past their retention period
 *
 * Trigger: Daily at 2:00 AM UTC
 */

import { schedules } from '@trigger.dev/sdk/v3'
import { auditService } from '#app/utils/audit.server.ts'
import { logger } from '#app/utils/logger.server.ts'

export const auditLogArchivalTask = schedules.task({
	id: 'audit-log-archival',
	// Run daily at 2:00 AM UTC
	cron: '0 2 * * *',
	run: async (payload, { ctx }) => {
		logger.info('Starting audit log archival job')

		try {
			// Run the archival process
			const result = await auditService.archiveOldLogs()

			logger.info(
				{
					archived: result.archived,
					deleted: result.deleted,
				},
				'Audit log archival completed successfully',
			)

			return {
				success: true,
				archived: result.archived,
				deleted: result.deleted,
				timestamp: new Date().toISOString(),
			}
		} catch (error) {
			logger.error(
				{ err: error },
				'Audit log archival failed',
			)

			// Re-throw to mark the job as failed in Trigger.dev
			throw error
		}
	},
})

// Alternative: Manual trigger version (can be called from admin UI)
export const manualAuditLogArchivalTask = schedules.task({
	id: 'audit-log-archival-manual',
	run: async (payload, { ctx }) => {
		logger.info('Starting manual audit log archival')

		const result = await auditService.archiveOldLogs()

		logger.info(
			{
				archived: result.archived,
				deleted: result.deleted,
			},
			'Manual audit log archival completed',
		)

		return {
			success: true,
			archived: result.archived,
			deleted: result.deleted,
			timestamp: new Date().toISOString(),
		}
	},
})
