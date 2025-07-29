import { formatDistanceToNow } from 'date-fns'
import { Icon } from '#app/components/ui/icon.tsx'

type ActivityLog = {
	id: string
	action: string
	metadata: string | null
	createdAt: Date
	user: {
		id: string
		name: string | null
		username: string
	}
	targetUser?: {
		id: string
		name: string | null
		username: string
	} | null
	integration?: {
		id: string
		providerName: string
		providerType: string
	} | null
}

interface ActivityLogProps {
	activityLogs: ActivityLog[]
}

function formatActivityMessage(log: {
	action: string
	metadata: string | null
	user: { name: string | null; username: string }
	targetUser?: { name: string | null; username: string } | null
	integration?: { providerName: string } | null
}): string {
	const userName = log.user.name || log.user.username
	const targetUserName = log.targetUser ? (log.targetUser.name || log.targetUser.username) : null
	const metadata = log.metadata ? JSON.parse(log.metadata) as Record<string, any> : {}

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

function getActivityIcon(action: string) {
	switch (action) {
		case 'viewed':
			return 'magnifying-glass'
		case 'created':
			return 'plus'
		case 'updated':
			return 'pencil-1'
		case 'deleted':
			return 'trash'
		case 'sharing_changed':
			return 'lock-open-1'
		case 'access_granted':
		case 'access_revoked':
			return 'person'
		case 'integration_connected':
		case 'integration_disconnected':
			return 'link-2'
		case 'comment_added':
		case 'comment_deleted':
			return 'envelope-closed'
		default:
			return 'clock'
	}
}

function getActivityColor(action: string) {
	switch (action) {
		case 'deleted':
		case 'access_revoked':
		case 'integration_disconnected':
		case 'comment_deleted':
			return 'text-red-600'
		case 'created':
		case 'access_granted':
		case 'integration_connected':
		case 'comment_added':
			return 'text-green-600'
		case 'updated':
		case 'sharing_changed':
			return 'text-blue-600'
		case 'viewed':
			return 'text-gray-500'
		default:
			return 'text-gray-600'
	}
}

export function ActivityLog({ activityLogs }: ActivityLogProps) {
	if (activityLogs.length === 0) {
		return (
			<div className="mt-8 p-4 text-center text-gray-500">
				<Icon name="clock" className="mx-auto mb-2 h-8 w-8" />
				<p>No activity yet</p>
			</div>
		)
	}

	return (
		<div className="mt-8">
			<h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
			<div className="space-y-3">
				{activityLogs.map((log) => (
					<div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
						<div className={`mt-0.5 ${getActivityColor(log.action)}`}>
							<Icon name={getActivityIcon(log.action)} className="h-4 w-4" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm text-gray-900">
								{formatActivityMessage(log)}
							</p>
							<p className="text-xs text-gray-500 mt-1">
								{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}