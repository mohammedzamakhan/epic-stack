import { prisma } from '@repo/database'
import { logger } from '@repo/observability'

export type ActivityAction =
	| 'viewed'
	| 'created'
	| 'updated'
	| 'deleted'
	| 'sharing_changed'
	| 'access_granted'
	| 'access_revoked'
	| 'integration_connected'
	| 'integration_disconnected'
	| 'comment_added'
	| 'comment_deleted'

export interface ActivityLogOptions {
	noteId: string
	userId: string
	action: ActivityAction
	metadata?: Record<string, any>
	targetUserId?: string
	integrationId?: string
	commentId?: string
}

export async function logNoteActivity(options: ActivityLogOptions) {
	const {
		noteId,
		userId,
		action,
		metadata,
		targetUserId,
		integrationId,
		commentId,
	} = options

	try {
		await prisma.noteActivityLog.create({
			data: {
				noteId,
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
			{ err: error, noteId, userId, action },
			'Failed to log note activity',
		)
	}
}

export async function getNoteActivityLogs(noteId: string, limit = 50) {
	return prisma.noteActivityLog.findMany({
		where: { noteId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
			targetUser: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
			integration: {
				select: {
					id: true,
					providerName: true,
					providerType: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	})
}

export function formatActivityMessage(log: {
	action: string
	metadata: string | null
	user: { name: string | null; username: string }
	targetUser?: { name: string | null; username: string } | null
	integration?: { providerName: string } | null
}): string {
	const userName = log.user.name || log.user.username
	const targetUserName = log.targetUser
		? log.targetUser.name || log.targetUser.username
		: null
	const metadata = log.metadata
		? (JSON.parse(log.metadata) as Record<string, any>)
		: {}

	switch (log.action) {
		case 'viewed':
			return `${userName} viewed the note`
		case 'created':
			return `${userName} created the note`
		case 'updated':
			const hasContentChange = metadata.contentChanged
			const hasTitleChange = metadata.titleChanged
			if (hasContentChange && hasTitleChange) {
				return `${userName} updated the title and content`
			} else if (hasTitleChange) {
				return `${userName} updated the title`
			} else if (hasContentChange) {
				return `${userName} updated the content`
			} else {
				return `${userName} updated the note`
			}
		case 'deleted':
			return `${userName} deleted the note`
		case 'sharing_changed':
			const isPublic = metadata.isPublic
			return `${userName} made the note ${isPublic ? 'public' : 'private'}`
		case 'access_granted':
			return `${userName} granted access to ${targetUserName}`
		case 'access_revoked':
			return `${userName} revoked access from ${targetUserName}`
		case 'integration_connected':
			const channelName = metadata.channelName || metadata.externalId
			return `${userName} connected note to ${log.integration?.providerName} channel: ${channelName}`
		case 'integration_disconnected':
			const disconnectedChannel = metadata.channelName || metadata.externalId
			return `${userName} disconnected note from ${log.integration?.providerName} channel: ${disconnectedChannel}`
		case 'comment_added':
			const isReply = metadata.parentId
			return `${userName} ${isReply ? 'replied to a comment' : 'added a comment'}`
		case 'comment_deleted':
			return `${userName} deleted a comment`
		default:
			return `${userName} performed an action`
	}
}
