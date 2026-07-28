/**
 * Background job to archive old audit logs
 * Delegates directly to canonical AuditRetentionManager implementation.
 *
 * Runs daily at 2 AM UTC via declarative cron schedule.
 */

import { auditRetentionManager } from '@repo/audit'
import { schedules, logger } from '@trigger.dev/sdk/v3'

export const auditLogArchival = schedules.task({
	id: 'audit-log-archival',
	cron: '0 2 * * *', // Daily at 2 AM UTC
	run: async (_payload) => {
		logger.info('Starting audit log archival job')

		try {
			const { archived, deleted } = await auditRetentionManager.archiveOldLogs()

			logger.info('Audit log archival completed successfully', {
				archived,
				deleted,
			})

			return {
				success: true,
				archived,
				deleted,
				timestamp: new Date().toISOString(),
			}
		} catch (error) {
			logger.error('Audit log archival failed', { error })
			throw error
		}
	},
})
