/**
 * GDPR Data Retention Cleanup Background Job
 * Runs daily to clean up expired data according to retention policies
 */

import { cronTrigger } from '@trigger.dev/sdk'
import { client } from './client'

export const gdprCleanupJob = client.defineJob({
	id: 'gdpr-cleanup',
	name: 'GDPR Data Retention Cleanup',
	version: '1.0.0',
	trigger: cronTrigger({
		cron: '0 2 * * *', // Daily at 2:00 AM UTC
	}),
	run: async (payload, io, ctx) => {
		await io.logger.info('Starting GDPR data retention cleanup...')

		try {
			// Import the cleanup function
			const { runDataRetentionCleanup } = await import(
				'../../apps/app/app/utils/gdpr-retention.server'
			)

			// Run the cleanup
			const results = await io.runTask('cleanup-expired-data', async () => {
				return await runDataRetentionCleanup()
			})

			// Log results
			await io.logger.info('GDPR cleanup completed successfully', {
				results,
				totalCleaned:
					results.sessions +
					results.refreshTokens +
					results.verifications +
					results.auditLogs +
					results.deletedUsers +
					results.integrationLogs +
					results.ipTracking,
			})

			// Send notification if significant cleanup occurred
			if (results.deletedUsers > 0) {
				await io.logger.warn(
					`${results.deletedUsers} user(s) permanently deleted`,
					{
						deletedUsers: results.deletedUsers,
					},
				)
			}

			return {
				success: true,
				...results,
			}
		} catch (error) {
			await io.logger.error('GDPR cleanup failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			})
			throw error
		}
	},
})

/**
 * Manual cleanup trigger (for admin use)
 */
export const manualGdprCleanupJob = client.defineJob({
	id: 'manual-gdpr-cleanup',
	name: 'Manual GDPR Cleanup Trigger',
	version: '1.0.0',
	trigger: {
		type: 'manual',
	},
	run: async (payload, io, ctx) => {
		await io.logger.info('Manual GDPR cleanup triggered by admin')

		try {
			const { runDataRetentionCleanup } = await import(
				'../../apps/app/app/utils/gdpr-retention.server'
			)

			const results = await io.runTask('cleanup-expired-data', async () => {
				return await runDataRetentionCleanup()
			})

			await io.logger.info('Manual GDPR cleanup completed', { results })

			return {
				success: true,
				triggeredBy: 'manual',
				...results,
			}
		} catch (error) {
			await io.logger.error('Manual GDPR cleanup failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			})
			throw error
		}
	},
})
