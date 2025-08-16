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

function getActivityIcon(action: string) {
	switch (action) {
		case 'viewed':
			return 'search'
		case 'created':
			return 'plus'
		case 'updated':
			return 'pencil'
		case 'deleted':
			return 'trash-2'
		case 'sharing_changed':
			return 'lock-open'
		case 'access_granted':
		case 'access_revoked':
			return 'person'
		case 'integration_connected':
		case 'integration_disconnected':
			return 'link-2'
		case 'comment_added':
		case 'comment_deleted':
			return 'mail'
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
			return 'text-destructive bg-destructive/10 border-destructive/20'
		case 'created':
		case 'access_granted':
		case 'integration_connected':
		case 'comment_added':
			return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
		case 'updated':
		case 'sharing_changed':
			return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800'
		case 'viewed':
			return 'text-muted-foreground bg-muted border-border'
		default:
			return 'text-muted-foreground bg-muted border-border'
	}
}

export function ActivityLog({ activityLogs }: ActivityLogProps) {
	if (activityLogs.length === 0) {
		return (
			<div>
				<div className="mb-6 flex items-center gap-2">
					<Icon name="folder-open" className="h-5 w-5" />
					<h2 className="text-lg font-semibold">Recent Activity</h2>
				</div>
				<div className="py-12 text-center">
					<div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<Icon
							name="folder-open"
							className="text-muted-foreground h-6 w-6"
						/>
					</div>
					<h3 className="text-foreground mb-1 text-sm font-medium">
						No activity yet
					</h3>
					<p className="text-muted-foreground text-sm">
						Activity will appear here as changes are made to this note.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div>
			<div className="mb-4 flex items-center gap-2">
				<Icon name="logs" className="text-muted-foreground h-5 w-5" />
				<h2 className="text-lg font-semibold">Recent Activity</h2>
			</div>
			<div>
				{activityLogs.map((log, index) => (
					<div key={log.id} className="group relative">
						{/* Timeline line */}
						{index < activityLogs.length - 1 && (
							<div className="bg-border absolute top-8 bottom-0 left-4 w-px" />
						)}

						<div className="flex items-start gap-3">
							<div
								className={`border-background bg-background relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${getActivityColor(log.action)}`}
							>
								<Icon
									name={getActivityIcon(log.action)}
									className="h-3.5 w-3.5"
								/>
							</div>
							<div className="min-w-0 flex-1 pt-1">
								<p className="text-foreground text-sm leading-relaxed">
									{formatActivityMessage(log)}
								</p>
								<p className="text-muted-foreground mt-1 mb-4 text-xs">
									{formatDistanceToNow(new Date(log.createdAt), {
										addSuffix: true,
									})}
								</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
