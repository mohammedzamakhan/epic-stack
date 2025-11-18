import type { Preference } from '@novu/react'
import { usePreferences, useNovu } from '@novu/react'
import React, { useState, useEffect, useCallback } from 'react'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Badge } from '@repo/ui/badge'
import { Switch } from '@repo/ui/switch'
import { Separator } from '@repo/ui/separator'
import { Icon, type IconName } from '@repo/ui/icon'

const channelIcons: Record<string, IconName> = {
	email: 'mail',
	sms: 'message-square',
	in_app: 'bell',
	push: 'bell',
	chat: 'message-circle',
}

// Channel labels function that uses lingui
function getChannelLabel(channel: string, _: (msg: any) => string): string {
	const labels: Record<string, any> = {
		email: msg`Email`,
		sms: msg`SMS`,
		in_app: msg`In-App`,
		push: msg`Push`,
		chat: msg`Chat`,
	}
	return _(labels[channel] || msg`${channel}`)
}

// Workflow labels function that uses lingui
function getWorkflowLabel(
	workflowName: string,
	_: (msg: any) => string,
): string {
	const labels: Record<string, any> = {
		'test-workflow': msg`Testing notifications`,
		'comment-mention-workflow': msg`Notifications when you are mentioned in a comment`,
		'note-comment-workflow': msg`Notifications when someone comments on your notes`,
	}
	return _(labels[workflowName] || msg`${workflowName}`)
}

function getChannelIcon(channel: string): IconName {
	return channelIcons[channel] ?? 'bell'
}

interface ChannelSwitchListProps {
	preference: Preference
	isUpdating: boolean
	onUpdate: (preference: Preference, channel: string, enabled: boolean) => void
	disabled: boolean
}

function ChannelSwitchList({
	preference,
	isUpdating,
	onUpdate,
	disabled,
}: ChannelSwitchListProps) {
	return (
		<div className="grid gap-1 pl-4">
			{Object.entries(preference.channels).map(([channel, enabled]) => (
				<div key={channel} className="flex items-center justify-between py-2">
					<div className="flex items-center gap-3">
						<Icon
							name={getChannelIcon(channel)}
							className="text-muted-foreground h-4 w-4"
						/>
						<span className="text-sm font-medium">
							{channelLabels[channel] || channel}
						</span>
					</div>
					<Switch
						checked={enabled}
						onCheckedChange={(checked) =>
							onUpdate(preference, channel, checked)
						}
						disabled={disabled || isUpdating}
					/>
				</div>
			))}
		</div>
	)
}

function NotificationPreferencesCardComponent() {
	const { _ } = useLingui()
	const { preferences, isLoading, error, refetch } = usePreferences()
	const novu = useNovu()
	const [updatingPreferences, setUpdatingPreferences] = useState<Set<string>>(
		new Set(),
	)
	const [isRefetching, setIsRefetching] = useState(false)
	const [hasMounted, setHasMounted] = useState(false)

	const handleRefetch = useCallback(async () => {
		setIsRefetching(true)
		try {
			await refetch()
		} catch (err) {
			console.error('Failed to refetch preferences:', err)
		} finally {
			setIsRefetching(false)
		}
	}, [refetch])

	// Force refetch when component mounts to ensure fresh data
	useEffect(() => {
		void handleRefetch()
	}, [])

	// Listen for preference updates from Novu
	useEffect(() => {
		const listener = () => {
			void handleRefetch()
		}

		// Listen for preference list updates
		novu.on('preferences.list.updated', listener)

		return () => {
			novu.off('preferences.list.updated', listener)
		}
	}, [novu, handleRefetch])

	const isLoadingState = isLoading || isRefetching

	const updatePreference = async (
		preference: Preference,
		channelType: string,
		enabled: boolean,
	) => {
		const preferenceId = preference.workflow?.id || 'global'
		setUpdatingPreferences((prev) => new Set(prev).add(preferenceId))

		try {
			await preference.update({
				channels: {
					[channelType]: enabled,
				},
			})
			await handleRefetch()
		} catch (error) {
			console.error('Failed to update preference:', error)
		} finally {
			setUpdatingPreferences((prev) => {
				const newSet = new Set(prev)
				newSet.delete(preferenceId)
				return newSet
			})
		}
	}

	if (isLoadingState) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>
						<Trans>Notification Preferences</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Manage your notification settings for different channels and
							workflows.
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center py-8">
						<div className="flex items-center gap-2">
							<Icon name="loader" className="h-4 w-4 animate-spin" />
							<span className="text-muted-foreground text-sm">
								<Trans>Loading preferences...</Trans>
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>
						<Trans>Notification Preferences</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Manage your notification settings for different channels and
							workflows.
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
						<Icon name="octagon-alert" className="h-4 w-4 text-red-600" />
						<p className="text-sm text-red-800">
							<Trans>
								Failed to load notification preferences: {error.message}
							</Trans>
						</p>
					</div>
					<Button
						variant="outline"
						onClick={handleRefetch}
						disabled={isRefetching}
						className="mt-4"
					>
						<Icon
							name="refresh-cw"
							className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
						/>
						{isRefetching ? <Trans>Retrying...</Trans> : <Trans>Retry</Trans>}
					</Button>
				</CardContent>
			</Card>
		)
	}

	if (!preferences || preferences.length === 0) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>
						<Trans>Notification Preferences</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Manage your notification settings for different channels and
							workflows.
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Icon
							name="bell"
							className="text-muted-foreground mb-4 h-12 w-12"
						/>
						<h3 className="mb-2 text-lg font-medium">
							<Trans>No preferences found</Trans>
						</h3>
						<p className="text-muted-foreground mb-4 text-sm">
							<Trans>No notification preferences are configured yet.</Trans>
						</p>
						<Button
							variant="outline"
							onClick={handleRefetch}
							disabled={isRefetching}
							className="mt-2"
						>
							<Icon
								name="refresh-cw"
								className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
							/>
							{isRefetching ? 'Refreshing...' : 'Refresh'}
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Group preferences by channel type for better organization
	const channels = ['email', 'sms', 'in_app', 'push', 'chat']
	const availableChannels = channels.filter((channel) =>
		preferences.some((pref) => channel in pref.channels),
	)

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>
					<Trans>Notification Preferences</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Manage your notification settings for different channels and
						workflows. Critical notifications cannot be disabled.
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Global Preferences */}
				{preferences
					.filter((pref) => !pref.workflow)
					.map((preference) => {
						const preferenceId = 'global'
						const isUpdating = updatingPreferences.has(preferenceId)

						return (
							<div key={preferenceId} className="space-y-2">
								<div className="flex items-center gap-2">
									<Icon name="settings" className="h-5 w-5" />
									<h3 className="text-lg font-medium">
										<Trans>Global Preferences</Trans>
									</h3>
								</div>
								<ChannelSwitchList
									preference={preference}
									isUpdating={isUpdating}
									onUpdate={updatePreference}
									disabled={false}
								/>
								<Separator />
							</div>
						)
					})}

				{/* Workflow-specific Preferences */}
				{preferences
					.filter((pref) => pref.workflow)
					.map((preference) => {
						const preferenceId = preference.workflow?.id || 'unknown'
						const isUpdating = updatingPreferences.has(preferenceId)

						return (
							<div key={preferenceId} className="space-y-2">
								<div className="flex items-center gap-2">
									<Icon name="cog" className="h-5 w-5" />
									<h3 className="text-lg font-medium">
										{preference.workflow?.name
											? getWorkflowLabel(preference.workflow?.name, _)
											: preference.workflow?.name}
									</h3>
									{preference.workflow?.critical && (
										<Badge variant="destructive" className="text-xs">
											<Trans>Critical</Trans>
										</Badge>
									)}
								</div>
								<ChannelSwitchList
									preference={preference}
									isUpdating={isUpdating}
									onUpdate={updatePreference}
									disabled={preference.workflow?.critical || false}
								/>
								{preference !== preferences[preferences.length - 1] && (
									<Separator />
								)}
							</div>
						)
					})}

				{/* Channel Overview */}
				{availableChannels.length > 0 && (
					<div className="mt-8 space-y-4">
						<h3 className="text-lg font-medium">
							<Trans>Channel Overview</Trans>
						</h3>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{availableChannels.map((channel) => {
								const enabledCount = preferences.filter(
									(pref) =>
										pref.channels[channel as keyof typeof pref.channels],
								).length
								const totalCount = preferences.filter(
									(pref) => channel in pref.channels,
								).length

								return (
									<Card key={channel} className="p-4">
										<div className="mb-2 flex items-center gap-3">
											<Icon
												name={getChannelIcon(channel)}
												className="h-5 w-5"
											/>
											<span className="font-medium">
												{getChannelLabel(channel, _)}
											</span>
										</div>
										<p className="text-muted-foreground text-sm">
											<Trans>
												{enabledCount} of {totalCount} notifications enabled
											</Trans>
										</p>
									</Card>
								)
							})}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// Error boundary wrapper to handle cases where NovuProvider is not available
class NotificationPreferencesErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	componentDidCatch(error: Error) {
		// Only suppress the Novu provider errors
		if (
			!error.message.includes('useNovu must be used within a') &&
			!error.message.includes('usePreferences')
		) {
			console.error('NotificationPreferencesCard error:', error)
		}
	}

	render() {
		if (this.state.hasError) {
			// Show a fallback UI when Novu is not available
			return (
				<Card className="w-full">
					<CardHeader>
						<CardTitle>
							<Trans>Notification Preferences</Trans>
						</CardTitle>
						<CardDescription>
							<Trans>
								Notification preferences are not available at this time.
							</Trans>
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Icon
								name="bell"
								className="text-muted-foreground mb-4 h-12 w-12"
							/>
							<p className="text-muted-foreground text-sm">
								<Trans>
									Please ensure you have an active organization to manage
									notification preferences.
								</Trans>
							</p>
						</div>
					</CardContent>
				</Card>
			)
		}
		return this.props.children
	}
}

export function NotificationPreferencesCard() {
	return (
		<NotificationPreferencesErrorBoundary>
			<NotificationPreferencesCardComponent />
		</NotificationPreferencesErrorBoundary>
	)
}
