import { prisma } from '@repo/database'
import { logger } from '@repo/observability'

export type ProjectActivityAction =
	| 'viewed'
	| 'created'
	| 'updated'
	| 'deleted'
	| 'recording_added'
	| 'integration_connected'
	| 'integration_disconnected'

export interface ProjectActivityLogOptions {
	projectId: string
	userId: string
	action: ProjectActivityAction
	metadata?: Record<string, any>
	targetUserId?: string
	integrationId?: string
}

export async function logProjectActivity(options: ProjectActivityLogOptions) {
	const { projectId, userId, action, metadata, targetUserId } = options

	try {
		await prisma.projectActivityLog.create({
			data: {
				projectId,
				userId,
				action,
				metadata: metadata ? JSON.stringify(metadata) : null,
				targetUserId,
			},
		})
	} catch (error) {
		// Log the error but don't throw - activity logging shouldn't break the main functionality
		logger.error(
			{ err: error, projectId, userId, action },
			'Failed to log project activity',
		)
	}
}

export async function getProjectActivityLogs(projectId: string, limit = 50) {
	return prisma.projectActivityLog.findMany({
		where: { projectId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
			targetUser: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	})
}

export type RecordingActivityAction =
	| 'viewed'
	| 'created'
	| 'updated'
	| 'deleted'
	| 'status_changed'
	| 'priority_changed'
	| 'comment_added'
	| 'comment_deleted'
	| 'integration_connected'
	| 'integration_disconnected'

export interface RecordingActivityLogOptions {
	recordingId: string
	userId: string
	action: RecordingActivityAction
	metadata?: Record<string, any>
	targetUserId?: string
	integrationId?: string
	commentId?: string
}

export async function logRecordingActivity(
	options: RecordingActivityLogOptions,
) {
	const {
		recordingId,
		userId,
		action,
		metadata,
		targetUserId,
		integrationId,
		commentId,
	} = options

	try {
		await prisma.recordingActivityLog.create({
			data: {
				recordingId,
				userId,
				action,
				metadata: metadata ? JSON.stringify(metadata) : null,
				targetUserId,
				integrationId,
				commentId,
			},
		})
	} catch (error) {
		// Log the error but don't throw - activity logging shouldn't break the main functionality
		logger.error(
			{ err: error, recordingId, userId, action },
			'Failed to log recording activity',
		)
	}
}

export async function getRecordingActivityLogs(
	recordingId: string,
	limit = 50,
) {
	return prisma.recordingActivityLog.findMany({
		where: { recordingId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
			targetUser: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
			integration: {
				select: {
					id: true,
					providerName: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	})
}
