import { schedules, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '@repo/database'
import { auditService, AuditAction } from '@repo/audit'

export const gdprErasure = schedules.task({
	id: 'gdpr-erasure-processor',
	cron: '0 4 * * *', // Daily at 4 AM UTC
	run: async (_payload) => {
		logger.info('Starting scheduled GDPR erasure job')

		const now = new Date()
		const dueRequests = await prisma.dataSubjectRequest.findMany({
			where: {
				type: 'erasure',
				status: 'scheduled',
				scheduledFor: { lte: now },
			},
			include: {
				user: {
					select: { id: true, email: true },
				},
			},
		})

		const results = {
			processed: 0,
			failed: 0,
			errors: [] as Array<{ requestId: string; error: string }>,
		}

		for (const dsr of dueRequests) {
			try {
				await prisma.dataSubjectRequest.update({
					where: { id: dsr.id },
					data: {
						status: 'processing',
						processedAt: new Date(),
					},
				})

				if (dsr.userId) {
					await prisma.user.delete({
						where: { id: dsr.userId },
					})
				}

				await prisma.dataSubjectRequest.update({
					where: { id: dsr.id },
					data: {
						status: 'completed',
						completedAt: new Date(),
						executedAt: new Date(),
					},
				})

				await auditService.log({
					action: AuditAction.DATA_DELETION_COMPLETED,
					details: `User account deleted (GDPR Article 17). User ID: ${dsr.userId}`,
					resourceType: 'data_subject_request',
					resourceId: dsr.id,
					metadata: {
						userId: dsr.userId,
						requestedAt: dsr.requestedAt.toISOString(),
						scheduledFor: dsr.scheduledFor?.toISOString(),
					},
					severity: 'warning',
				})

				results.processed++
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'

				await prisma.dataSubjectRequest.update({
					where: { id: dsr.id },
					data: {
						status: 'failed',
						failureReason: errorMessage,
					},
				})

				await auditService.log({
					action: AuditAction.DATA_DELETION_FAILED,
					details: `Failed to delete user account: ${errorMessage}`,
					resourceType: 'data_subject_request',
					resourceId: dsr.id,
					metadata: {
						userId: dsr.userId,
						error: errorMessage,
					},
					severity: 'error',
				})

				results.failed++
				results.errors.push({ requestId: dsr.id, error: errorMessage })
			}
		}

		logger.info('GDPR erasure job completed', { results })
		return results
	},
})
