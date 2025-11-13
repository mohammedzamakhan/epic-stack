import { formatDistanceToNow } from 'date-fns'
import { Icon } from '@repo/ui'

/**
 * Escape HTML special characters to prevent XSS
 * This is used for user-generated content that needs to be displayed as text
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div')
	div.textContent = text
	return div.innerHTML
}

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
	// Escape user-generated content to prevent XSS attacks
	const userName = escapeHtml(log.user.name || log.user.username)
	const targetUserName = log.targetUser
		? escapeHtml(log.targetUser.name || log.targetUser.username)
		: null
	const metadata = log.metadata
		? (JSON.parse(log.metadata) as Record<string, any>)
		: {}

	switch (log.action) {
		case 'viewed':
			return `<span class="font-bold">${userName}</span> viewed the note`
		case 'created':
			return `<span class="font-bold">${userName}</span> created the note`
		case 'updated':
			const hasContentChange = metadata.contentChanged
			const hasTitleChange = metadata.titleChanged
			if (hasContentChange && hasTitleChange) {
				return `<span class="font-bold">${userName}</span> updated the title and content`
			} else if (hasTitleChange) {
				return `<span class="font-bold">${userName}</span> updated the title`
			} else if (hasContentChange) {
				return `<span class="font-bold">${userName}</span> updated the content`
			} else {
				return `<span class="font-bold">${userName}</span> updated the note`
			}
		case 'deleted':
			return `<span class="font-bold">${userName}</span> deleted the note`
		case 'sharing_changed':
			const isPublic = metadata.isPublic
			return `<span class="font-bold">${userName}</span> made the note ${isPublic ? 'public' : 'private'}`
		case 'access_granted':
			return `<span class="font-bold">${userName}</span> granted access to ${targetUserName}`
		case 'access_revoked':
			return `<span class="font-bold">${userName}</span> revoked access from ${targetUserName}`
		case 'integration_connected':
			const channelName = escapeHtml(
				metadata.channelName || metadata.externalId || 'unknown',
			)
			const providerName = log.integration?.providerName
				? escapeHtml(log.integration.providerName)
				: 'unknown'
			return `<span class="font-bold">${userName}</span> connected note to ${providerName} channel: ${channelName}`
		case 'integration_disconnected':
			const disconnectedChannel = escapeHtml(
				metadata.channelName || metadata.externalId || 'unknown',
			)
			const disconnectedProvider = log.integration?.providerName
				? escapeHtml(log.integration.providerName)
				: 'unknown'
			return `<span class="font-bold">${userName}</span> disconnected note from ${disconnectedProvider} channel: ${disconnectedChannel}`
		case 'comment_added':
			const isReply = metadata.parentId
			return `<span class="font-bold">${userName}</span> ${isReply ? 'replied to a comment' : 'added a comment'}`
		case 'comment_deleted':
			return `<span class="font-bold">${userName}</span> deleted a comment`
		default:
			return `<span class="font-bold">${userName}</span> performed an action`
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
			return 'unlock'
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
								className={`border-background bg-background text-muted-foreground bg-muted border-border relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-1`}
							>
								<Icon
									name={getActivityIcon(log.action)}
									className="h-3.5 w-3.5"
								/>
							</div>
							<div className="min-w-0 flex-1 pt-1">
								<p
									className="text-foreground text-sm leading-relaxed"
									dangerouslySetInnerHTML={{
										__html: formatActivityMessage(log),
									}}
								></p>
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
