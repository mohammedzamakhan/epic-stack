/**
 * Background job to archive old audit logs
 *
 * This job:
 * 1. Archives logs older than the hot storage period (move to cold storage)
 * 2. Deletes logs past their retention period
 *
 * Runs daily at 2 AM UTC via declarative cron schedule
 * Can also be triggered manually via: await auditLogArchival.trigger()
 */

import { schedules, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '@repo/prisma'

export const auditLogArchival = schedules.task({
	id: 'audit-log-archival',
	// Declarative cron schedule - syncs on deploy
	cron: '0 2 * * *', // Daily at 2 AM UTC
	run: async (_payload) => {
		logger.info('Starting audit log archival job')

		try {
			// Get all organizations with retention policies
			const policies = await prisma.auditLogRetentionPolicy.findMany()

			let totalArchived = 0
			let totalDeleted = 0

			// Process each organization's retention policy
			for (const policy of policies) {
				// Archive logs older than hotStorageDays
				const archiveDate = new Date()
				archiveDate.setDate(archiveDate.getDate() - policy.hotStorageDays)

				if (policy.archiveEnabled) {
					const { count } = await prisma.auditLog.updateMany({
						where: {
							organizationId: policy.organizationId,
							createdAt: { lt: archiveDate },
							archived: false,
						},
						data: {
							archived: true,
						},
					})
					totalArchived += count

					logger.info('Archived logs for organization', {
						organizationId: policy.organizationId,
						count,
					})
				}

				// Delete logs past retention period
				const deleteResult = await prisma.auditLog.deleteMany({
					where: {
						organizationId: policy.organizationId,
						retainUntil: { lt: new Date() },
					},
				})
				totalDeleted += deleteResult.count

				if (deleteResult.count > 0) {
					logger.info('Deleted expired logs for organization', {
						organizationId: policy.organizationId,
						count: deleteResult.count,
					})
				}
			}

			// Handle logs without organization (system logs)
			const systemArchiveDate = new Date()
			systemArchiveDate.setDate(systemArchiveDate.getDate() - 180)

			const { count: systemArchived } = await prisma.auditLog.updateMany({
				where: {
					organizationId: null,
					createdAt: { lt: systemArchiveDate },
					archived: false,
				},
				data: {
					archived: true,
				},
			})
			totalArchived += systemArchived

			if (systemArchived > 0) {
				logger.info('Archived system logs', { count: systemArchived })
			}

			// Delete system logs older than 1 year
			const systemDeleteDate = new Date()
			systemDeleteDate.setFullYear(systemDeleteDate.getFullYear() - 1)

			const systemDeleted = await prisma.auditLog.deleteMany({
				where: {
					organizationId: null,
					retainUntil: { lt: systemDeleteDate },
				},
			})
			totalDeleted += systemDeleted.count

			if (systemDeleted.count > 0) {
				logger.info('Deleted expired system logs', {
					count: systemDeleted.count,
				})
			}

			logger.info('Audit log archival completed successfully', {
				archived: totalArchived,
				deleted: totalDeleted,
			})

			return {
				success: true,
				archived: totalArchived,
				deleted: totalDeleted,
				timestamp: new Date().toISOString(),
			}
		} catch (error) {
			logger.error('Audit log archival failed', { error })

			// Re-throw to mark the job as failed in Trigger.dev
			throw error
		}
	},
})
