import { prisma } from '@repo/database'
import { logger } from '@repo/observability'
import { auditService, AuditAction } from '@repo/audit'

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

const ACTION_MAP: Record<ActivityAction, AuditAction> = {
	viewed: AuditAction.NOTE_VIEWED,
	created: AuditAction.NOTE_CREATED,
	updated: AuditAction.NOTE_UPDATED,
	deleted: AuditAction.NOTE_DELETED,
	sharing_changed: AuditAction.NOTE_SHARED, // Closest match, usually involves changing visibility
	access_granted: AuditAction.NOTE_ACCESS_GRANTED,
	access_revoked: AuditAction.NOTE_ACCESS_REVOKED,
	integration_connected: AuditAction.INTEGRATION_CONNECTED,
	integration_disconnected: AuditAction.INTEGRATION_DISCONNECTED,
	comment_added: AuditAction.NOTE_COMMENT_ADDED,
	comment_deleted: AuditAction.NOTE_COMMENT_DELETED,
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
		// Prepare metadata with additional fields that were previously separate columns
		const enrichedMetadata: Record<string, any> = {
			...metadata,
			integrationId,
			commentId,
		}

		// Look up details for the log message if needed
		let details = `Note ${action}`

		// If integration connected/disconnected, try to get provider name if not in metadata
		if (
			(action === 'integration_connected' ||
				action === 'integration_disconnected') &&
			integrationId &&
			!metadata?.providerName
		) {
			const integration = await prisma.integration.findUnique({
				where: { id: integrationId },
				select: { providerName: true },
			})
			if (integration) {
				enrichedMetadata.providerName = integration.providerName
				details = `Note ${action} (${integration.providerName})`
			}
		}

		await auditService.log({
			action: ACTION_MAP[action] || AuditAction.NOTE_UPDATED,
			userId,
			resourceType: 'note',
			resourceId: noteId,
			targetUserId,
			details,
			metadata: enrichedMetadata,
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
	// Query the unified audit log table instead of the deprecated NoteActivityLog
	// We map the AuditLog entries back to the shape expected by the UI
	const logs = await prisma.auditLog.findMany({
		where: {
			resourceType: 'note',
			resourceId: noteId,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
			// Note: AuditLog doesn't have direct relation to targetUser or integration
			// We might need to fetch these if strictly required, but for now we'll rely on metadata
			// or handle the missing data gracefully in the UI
		},
		orderBy: { createdAt: 'desc' },
		take: limit,
	})

	// Map AuditLog back to the expected structure for backward compatibility
	// We need to fetch target users if present to fully match the expected return type
	const targetUserIds = logs
		.filter((l) => l.targetUserId)
		.map((l) => l.targetUserId!)
	let targetUsers: Record<string, any> = {}

	if (targetUserIds.length > 0) {
		const users = await prisma.user.findMany({
			where: { id: { in: targetUserIds } },
			select: {
				id: true,
				name: true,
				username: true,
			},
		})
		targetUsers = users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {})
	}

	return logs.map((log) => {
		const metadata = (log.metadata ? JSON.parse(log.metadata) : {}) as Record<
			string,
			any
		>

		// Reverse map the action (best effort)
		let originalAction: string = log.action
		const entry = Object.entries(ACTION_MAP).find(([_, v]) => v === log.action)
		if (entry) originalAction = entry[0]

		return {
			id: log.id,
			noteId: log.resourceId!,
			userId: log.userId!,
			action: originalAction,
			metadata: log.metadata,
			targetUserId: log.targetUserId,
			integrationId: metadata.integrationId,
			commentId: metadata.commentId,
			createdAt: log.createdAt,
			user: log.user!,
			targetUser: log.targetUserId ? targetUsers[log.targetUserId] : null,
			integration: metadata.providerName
				? { providerName: metadata.providerName }
				: null,
		}
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
		case AuditAction.NOTE_VIEWED:
			return `${userName} viewed the note`
		case 'created':
		case AuditAction.NOTE_CREATED:
			return `${userName} created the note`
		case 'updated':
		case AuditAction.NOTE_UPDATED:
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
		case AuditAction.NOTE_DELETED:
			return `${userName} deleted the note`
		case 'sharing_changed':
		case AuditAction.NOTE_SHARED:
			const isPublic = metadata.isPublic
			return `${userName} made the note ${isPublic ? 'public' : 'private'}`
		case 'access_granted':
		case AuditAction.NOTE_ACCESS_GRANTED:
			return `${userName} granted access to ${targetUserName}`
		case 'access_revoked':
		case AuditAction.NOTE_ACCESS_REVOKED:
			return `${userName} revoked access from ${targetUserName}`
		case 'integration_connected':
		case AuditAction.INTEGRATION_CONNECTED:
			const channelName = metadata.channelName || metadata.externalId
			const providerName =
				log.integration?.providerName || metadata.providerName
			return `${userName} connected note to ${providerName} channel: ${channelName}`
		case 'integration_disconnected':
		case AuditAction.INTEGRATION_DISCONNECTED:
			const disconnectedChannel = metadata.channelName || metadata.externalId
			const disconnectedProvider =
				log.integration?.providerName || metadata.providerName
			return `${userName} disconnected note from ${disconnectedProvider} channel: ${disconnectedChannel}`
		case 'comment_added':
		case AuditAction.NOTE_COMMENT_ADDED:
			const isReply = metadata.parentId
			return `${userName} ${isReply ? 'replied to a comment' : 'added a comment'}`
		case 'comment_deleted':
		case AuditAction.NOTE_COMMENT_DELETED:
			return `${userName} deleted a comment`
		default:
			return `${userName} performed an action`
	}
}
