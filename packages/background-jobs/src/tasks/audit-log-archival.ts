/**
 * Background job to archive old audit logs
 *
 * This job:
 * 1. Archives logs older than the hot storage period (move to cold storage)
 * 2. Deletes logs past their retention period
 *
 * Schedule this task in Trigger.dev dashboard to run daily at 2 AM UTC (cron: 0 2 * * *)
 * Or trigger manually via: await auditLogArchival.trigger()
 */

import { task, logger } from '@trigger.dev/sdk/v3'
import { auditService } from '../../../apps/app/app/utils/audit.server'

export const auditLogArchival = task({
	id: 'audit-log-archival',
	run: async (payload: { manual?: boolean } = {}) => {
		logger.info('Starting audit log archival job', { manual: payload.manual })

		try {
			// Run the archival process
			const result = await auditService.archiveOldLogs()

			logger.info('Audit log archival completed successfully', {
				archived: result.archived,
				deleted: result.deleted,
			})

			return {
				success: true,
				archived: result.archived,
				deleted: result.deleted,
				timestamp: new Date().toISOString(),
			}
		} catch (error) {
			logger.error('Audit log archival failed', { error })

			// Re-throw to mark the job as failed in Trigger.dev
			throw error
		}
	},
})
