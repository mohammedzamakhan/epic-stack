import { UserAvatar } from '../user-avatar'
import { Badge } from '@repo/ui/badge'
import { cn } from '@repo/ui/cn'
import { Icon } from '@repo/ui/icon'
import { format, isToday, isYesterday } from 'date-fns'

export type ActivityLog = {
	id: string
	action: string
	metadata: string | null
	createdAt: Date
	user: {
		id: string
		name: string | null
		username: string
		image?: string | null
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

type ActionConfig = {
	icon: string
	label: string
	variant: 'default' | 'secondary' | 'outline' | 'destructive'
	bgColor: string
	iconColor: string
}

function parseMetadata(metadata: string | null): Record<string, any> {
	if (!metadata) return {}
	try {
		return JSON.parse(metadata) as Record<string, any>
	} catch (error) {
		return {}
	}
}

function getActionConfig(action: string): ActionConfig {
	switch (action) {
		case 'viewed':
			return {
				icon: 'eye',
				label: 'Viewed',
				variant: 'secondary',
				bgColor: 'bg-blue-500/10',
				iconColor: 'text-blue-500',
			}
		case 'created':
			return {
				icon: 'plus',
				label: 'Created',
				variant: 'secondary',
				bgColor: 'bg-green-500/10',
				iconColor: 'text-green-500',
			}
		case 'updated':
			return {
				icon: 'pencil',
				label: 'Edited',
				variant: 'secondary',
				bgColor: 'bg-amber-500/10',
				iconColor: 'text-amber-500',
			}
		case 'deleted':
			return {
				icon: 'trash-2',
				label: 'Deleted',
				variant: 'destructive',
				bgColor: 'bg-red-500/10',
				iconColor: 'text-red-500',
			}
		case 'sharing_changed':
			return {
				icon: 'globe',
				label: 'Sharing',
				variant: 'secondary',
				bgColor: 'bg-purple-500/10',
				iconColor: 'text-purple-500',
			}
		case 'access_granted':
			return {
				icon: 'user-plus',
				label: 'Invited',
				variant: 'secondary',
				bgColor: 'bg-teal-500/10',
				iconColor: 'text-teal-500',
			}
		case 'access_revoked':
			return {
				icon: 'user-x',
				label: 'Removed',
				variant: 'destructive',
				bgColor: 'bg-red-500/10',
				iconColor: 'text-red-500',
			}
		case 'integration_connected':
			return {
				icon: 'link-2',
				label: 'Connected',
				variant: 'secondary',
				bgColor: 'bg-indigo-500/10',
				iconColor: 'text-indigo-500',
			}
		case 'integration_disconnected':
			return {
				icon: 'unlink',
				label: 'Disconnected',
				variant: 'outline',
				bgColor: 'bg-gray-500/10',
				iconColor: 'text-gray-500',
			}
		case 'comment_added':
			return {
				icon: 'message-circle',
				label: 'Comment',
				variant: 'secondary',
				bgColor: 'bg-cyan-500/10',
				iconColor: 'text-cyan-500',
			}
		case 'comment_deleted':
			return {
				icon: 'message-square',
				label: 'Deleted',
				variant: 'outline',
				bgColor: 'bg-gray-500/10',
				iconColor: 'text-gray-500',
			}
		default:
			return {
				icon: 'clock',
				label: 'Activity',
				variant: 'outline',
				bgColor: 'bg-gray-500/10',
				iconColor: 'text-muted-foreground',
			}
	}
}

function formatActivityDescription(log: ActivityLog): string {
	const metadata = parseMetadata(log.metadata)

	switch (log.action) {
		case 'viewed':
			return 'viewed this note'
		case 'created':
			return 'created this note'
		case 'updated':
			if (metadata.contentChanged && metadata.titleChanged)
				return 'updated the title and content'
			if (metadata.titleChanged) return 'updated the title'
			if (metadata.contentChanged) return 'updated the content'
			return 'made changes'
		case 'deleted':
			return 'deleted this note'
		case 'sharing_changed':
			return metadata.isPublic
				? 'made this note public'
				: 'made this note private'
		case 'access_granted': {
			const targetName = log.targetUser?.name || log.targetUser?.username
			return `invited ${targetName} to collaborate`
		}
		case 'access_revoked': {
			const removedName = log.targetUser?.name || log.targetUser?.username
			return `removed ${removedName}'s access`
		}
		case 'integration_connected': {
			const channelName =
				metadata.channelName || metadata.externalId || 'channel'
			return `connected to ${log.integration?.providerName || 'integration'} (${channelName})`
		}
		case 'integration_disconnected':
			return `disconnected from ${log.integration?.providerName || 'integration'}`
		case 'comment_added':
			return metadata.parentId ? 'replied to a comment' : 'left a comment'
		case 'comment_deleted':
			return 'deleted a comment'
		default:
			return 'performed an action'
	}
}

function formatDateHeader(date: Date): string {
	if (isToday(date)) return 'Today'
	if (isYesterday(date)) return 'Yesterday'
	return format(date, 'MMMM d, yyyy')
}

function groupLogsByDate(logs: ActivityLog[]): Map<string, ActivityLog[]> {
	const groups = new Map<string, ActivityLog[]>()

	logs.forEach((log) => {
		const date = new Date(log.createdAt)
		const dateKey = format(date, 'yyyy-MM-dd')

		if (!groups.has(dateKey)) groups.set(dateKey, [])
		groups.get(dateKey)!.push(log)
	})

	return groups
}

function ActivityItem({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
	const config = getActionConfig(log.action)
	const userName = log.user.name || log.user.username

	return (
		<div className="group relative flex gap-3">
			{!isLast && (
				<div className="bg-border/60 absolute top-10 bottom-0 left-4 w-px" />
			)}

			<div className="relative z-10">
				<UserAvatar
					user={{
						name: log.user.name,
						username: log.user.username,
						image: log.user.image,
					}}
					className="ring-background size-8 ring-2"
					fallbackClassName="bg-muted text-muted-foreground text-xs font-medium"
					alt={userName}
				/>
			</div>

			<div className="flex-1 pb-4">
				<div className="bg-card hover:bg-accent/30 ring-border/50 rounded-xl p-3 shadow-sm ring-1 transition-colors">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="text-foreground text-sm font-medium">
								{userName}
							</span>
							<Badge
								variant={config.variant}
								className={cn(
									'gap-1 px-1.5 py-0 text-[10px]',
									config.variant === 'default' && config.bgColor,
								)}
							>
								<Icon
									name={config.icon as any}
									className={cn(
										'h-2.5 w-2.5',
										config.variant !== 'default' && config.iconColor,
									)}
								/>
								{config.label}
							</Badge>
						</div>
						<span className="text-muted-foreground text-xs">
							{format(new Date(log.createdAt), 'h:mm a')}
						</span>
					</div>

					<p className="text-muted-foreground mt-1 text-sm">
						{formatActivityDescription(log)}
					</p>
				</div>
			</div>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
				<Icon name="clock" className="text-muted-foreground h-8 w-8" />
			</div>
			<h3 className="text-foreground mb-1 font-medium">No activity yet</h3>
			<p className="text-muted-foreground max-w-[240px] text-sm">
				Activity will appear here as you and your team make changes to this
				note.
			</p>
		</div>
	)
}

export function ActivityLog({ activityLogs }: ActivityLogProps) {
	if (activityLogs.length === 0) {
		return <EmptyState />
	}

	const groupedLogs = groupLogsByDate(activityLogs)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
						<Icon name="activity" className="text-primary h-4 w-4" />
					</div>
					<div>
						<h2 className="text-foreground text-base font-semibold">
							Activity
						</h2>
						<p className="text-muted-foreground text-xs">
							{activityLogs.length}{' '}
							{activityLogs.length === 1 ? 'event' : 'events'}
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-6">
				{Array.from(groupedLogs.entries()).map(([dateKey, logs]) => (
					<div key={dateKey}>
						<div className="mb-3 flex items-center gap-2">
							<span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
								{formatDateHeader(new Date(logs[0]!.createdAt))}
							</span>
							<div className="bg-border h-px flex-1" />
						</div>

						<div>
							{logs.map((log, index) => (
								<ActivityItem
									key={log.id}
									log={log}
									isLast={index === logs.length - 1}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
