import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Badge } from '@repo/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon, type IconName } from '@repo/ui/icon'
import { Separator } from '@repo/ui/separator'
import { Switch } from '@repo/ui/switch'
import React, { useEffect, useRef } from 'react'
import { useFetcher } from 'react-router'
import { HoneypotInputs } from 'remix-utils/honeypot/react'

const channelIcons: Record<string, IconName> = {
	email: 'mail',
	inApp: 'bell',
}

function getChannelLabel(channel: string, _: (msg: any) => string): string {
	const labels: Record<string, any> = {
		email: msg`Email`,
		inApp: msg`In-App`,
	}
	return _(labels[channel]) || channel
}

function getWorkflowLabel(
	workflowName: string,
	_: (msg: any) => string,
): string {
	const labels: Record<string, any> = {
		'comment-mention-workflow': msg`Notifications when you are mentioned in a comment`,
		'note-comment-workflow': msg`Notifications when someone comments on your notes`,
	}
	return _(labels[workflowName]) || workflowName
}

function getChannelIcon(channel: string): IconName {
	return channelIcons[channel] ?? 'bell'
}

type Preference = {
	workflow: string
	email: boolean
	inApp: boolean
}

// Workflows configuration
const workflows = [
	{
		id: 'comment-mention-workflow',
		name: 'comment-mention-workflow',
		critical: false,
	},
	{
		id: 'note-comment-workflow',
		name: 'note-comment-workflow',
		critical: false,
	},
]

interface ChannelSwitchListProps {
	preference: Preference
	isUpdating: boolean
	onUpdate: (workflow: string, channel: string, enabled: boolean) => void
	disabled: boolean
}

function ChannelSwitchList({
	preference,
	isUpdating,
	onUpdate,
	disabled,
}: ChannelSwitchListProps) {
	const { _ } = useLingui()
	const channels = ['email', 'inApp'] as const
	return (
		<div className="grid gap-1 sm:pl-4">
			{channels.map((channel) => (
				<div
					key={channel}
					className="flex items-center justify-between gap-3 py-2"
				>
					<div className="flex min-w-0 items-center gap-3">
						<Icon
							name={getChannelIcon(channel)}
							className="text-muted-foreground h-4 w-4 shrink-0"
						/>
						<span className="text-sm font-medium">
							{getChannelLabel(channel, _)}
						</span>
					</div>
					<Switch
						checked={preference[channel]}
						onCheckedChange={(checked) =>
							onUpdate(preference.workflow, channel, checked)
						}
						disabled={disabled || isUpdating}
					/>
				</div>
			))}
		</div>
	)
}

function WorkflowPreferenceRow({
	organizationId,
	workflow,
	serverPref,
	isLast,
}: {
	organizationId: string
	workflow: (typeof workflows)[0]
	serverPref: Preference
	isLast: boolean
}) {
	const { _ } = useLingui()
	const fetcher = useFetcher()
	const formRef = useRef<HTMLFormElement>(null)

	const isUpdating = fetcher.state !== 'idle'

	// Optimistic UI updates
	const pref = { ...serverPref }
	if (isUpdating && fetcher.formData) {
		const formChannel = fetcher.formData.get('channel') as 'email' | 'inApp'
		const formEnabled = fetcher.formData.get('enabled') === 'true'
		if (formChannel) {
			pref[formChannel] = formEnabled
		}
	}

	const updatePreference = (
		workflowId: string,
		channel: string,
		enabled: boolean,
	) => {
		const formData = new FormData(formRef.current!)
		formData.set('organizationId', organizationId)
		formData.set('workflow', workflowId)
		formData.set('channel', channel)
		formData.set('enabled', String(enabled))

		void fetcher.submit(formData, {
			method: 'POST',
			action: '/api/notifications/preferences',
		})
	}

	return (
		<div className="space-y-2">
			<form ref={formRef} className="hidden">
				<HoneypotInputs />
			</form>
			<div className="flex flex-wrap items-center gap-2">
				<Icon name="cog" className="h-4 w-4 shrink-0" />
				<h3 className="text-base font-medium">
					{getWorkflowLabel(workflow.name, _)}
				</h3>
				{workflow.critical && (
					<Badge variant="destructive" className="text-xs">
						<Trans>Critical</Trans>
					</Badge>
				)}
			</div>
			<ChannelSwitchList
				preference={pref}
				isUpdating={isUpdating}
				onUpdate={updatePreference}
				disabled={workflow.critical}
			/>
			{!isLast && <Separator />}
		</div>
	)
}

export function NotificationPreferencesCard({
	organizationId,
}: {
	organizationId: string
}) {
	const fetcher = useFetcher<{ preferences: Preference[] }>()

	useEffect(() => {
		if (fetcher.state === 'idle' && !fetcher.data) {
			void fetcher.load(
				`/api/notifications/preferences?organizationId=${organizationId}`,
			)
		}
	}, [fetcher, organizationId])

	const preferences = fetcher.data?.preferences || []

	const getPreference = (workflowId: string): Preference => {
		const pref = preferences.find((p) => p.workflow === workflowId)
		return pref || { workflow: workflowId, email: true, inApp: true }
	}

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
			<CardContent className="space-y-6">
				{workflows.map((workflow, index) => {
					const serverPref = getPreference(workflow.id)

					return (
						<WorkflowPreferenceRow
							key={workflow.id}
							organizationId={organizationId}
							workflow={workflow}
							serverPref={serverPref}
							isLast={index === workflows.length - 1}
						/>
					)
				})}
			</CardContent>
		</Card>
	)
}
