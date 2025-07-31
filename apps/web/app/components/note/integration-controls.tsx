import { useFetcher, useLoaderData } from 'react-router'
import { useState } from 'react'
import * as React from 'react'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { Badge } from '#app/components/ui/badge'
import { StatusButton } from '#app/components/ui/status-button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { cn } from '#app/utils/misc'

export const connectNoteActionIntent = 'connect-note-to-channel'
export const disconnectNoteActionIntent = 'disconnect-note-from-channel'

interface Integration {
	id: string
	providerName: string
	providerType: string
	isActive: boolean
}

interface Channel {
	id: string
	name: string
	type: 'public' | 'private' | 'dm'
}

interface Connection {
	id: string
	externalId: string
	config: any
	integration: Integration
}

interface IntegrationControlsProps {
	noteId: string
	connections: Connection[]
	availableIntegrations: Integration[]
}

export function IntegrationControls({
	noteId,
	connections,
	availableIntegrations,
}: IntegrationControlsProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const connectFetcher = useFetcher()
	const disconnectFetcher = useFetcher()

	const hasConnections = connections.length > 0
	const hasAvailableIntegrations = availableIntegrations.length > 0

	if (!hasAvailableIntegrations && !hasConnections) {
		return null // Don't show anything if no integrations are available
	}

	return (
		<div className="flex items-center gap-2">
			{/* Connection Status */}
			{hasConnections && (
				<div className="flex items-center gap-1">
					<Icon name="link-2" className="text-muted-foreground h-4 w-4" />
					<Badge variant="secondary" className="text-xs">
						{connections.length} connected
					</Badge>
				</div>
			)}

			{/* Manage Connections Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
					>
						<Icon name="link-2" className="h-4 w-4 max-md:scale-125">
							<span className="ml-1.5 max-md:hidden">
								{hasConnections ? 'Integrations' : 'Connect'}
							</span>
						</Icon>
						{hasConnections && (
							<span className="bg-primary/10 text-primary ml-1 rounded-full px-1.5 py-0.5 text-xs max-md:hidden">
								{connections.length}
							</span>
						)}
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Integration Connections</DialogTitle>
						<DialogDescription>
							Connect this note to external services to automatically share
							updates.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{/* Existing Connections */}
						{hasConnections && (
							<div className="space-y-3">
								<h4 className="text-sm font-medium">Connected Channels</h4>
								{connections.map((connection) => (
									<ConnectedChannelItem
										key={connection.id}
										connection={connection}
										onDisconnect={() => {
											const formData = new FormData()
											formData.append('intent', disconnectNoteActionIntent)
											formData.append('connectionId', connection.id)
											disconnectFetcher.submit(formData, { method: 'POST' })
										}}
										isDisconnecting={
											disconnectFetcher.state !== 'idle' &&
											disconnectFetcher.formData?.get('connectionId') ===
												connection.id
										}
									/>
								))}
							</div>
						)}

						{/* Add New Connection */}
						{hasAvailableIntegrations && (
							<div className="space-y-3">
								<h4 className="text-sm font-medium">
									{hasConnections ? 'Add Connection' : 'Connect to Channel'}
								</h4>
								<AddConnectionForm
									noteId={noteId}
									integrations={availableIntegrations}
									onConnect={(integrationId: string, channelId: string) => {
										const formData = new FormData()
										formData.append('intent', connectNoteActionIntent)
										formData.append('noteId', noteId)
										formData.append('integrationId', integrationId)
										formData.append('channelId', channelId)
										connectFetcher.submit(formData, { method: 'POST' })
									}}
									isConnecting={connectFetcher.state !== 'idle'}
								/>
							</div>
						)}

						{/* Empty State */}
						{!hasAvailableIntegrations && !hasConnections && (
							<div className="py-4 text-center">
								<Icon
									name="link-2"
									className="text-muted-foreground/50 mx-auto h-8 w-8"
								/>
								<p className="text-muted-foreground mt-2 text-sm">
									No integrations available. Connect your organization to
									external services first.
								</p>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}

interface ConnectedChannelItemProps {
	connection: Connection
	onDisconnect: () => void
	isDisconnecting: boolean
}

function ConnectedChannelItem({
	connection,
	onDisconnect,
	isDisconnecting,
}: ConnectedChannelItemProps) {
	const channelName = connection.config?.channelName || connection.externalId
	const providerName = connection.integration.providerName

	return (
		<div className="flex items-center justify-between rounded-lg border p-3">
			<div className="flex items-center space-x-3">
				<Icon name="link-2" className="text-muted-foreground h-4 w-4" />
				<div>
					<p className="text-sm font-medium">#{channelName}</p>
					<p className="text-muted-foreground text-xs capitalize">
						{providerName}
					</p>
				</div>
			</div>
			<StatusButton
				variant="outline"
				size="sm"
				onClick={onDisconnect}
				status={isDisconnecting ? 'pending' : 'idle'}
				className="text-destructive hover:text-destructive"
			>
				<Icon name="cross-1" className="h-3 w-3" />
			</StatusButton>
		</div>
	)
}

interface AddConnectionFormProps {
	noteId: string
	integrations: Integration[]
	onConnect: (integrationId: string, channelId: string) => void
	isConnecting: boolean
}

function AddConnectionForm({
	integrations,
	onConnect,
	isConnecting,
}: AddConnectionFormProps) {
	const [selectedIntegration, setSelectedIntegration] = useState<string>('')
	const [selectedChannel, setSelectedChannel] = useState<string>('')
	const [availableChannels, setAvailableChannels] = useState<Channel[]>([])
	const [isLoadingChannels, setIsLoadingChannels] = useState(false)
	const channelsFetcher = useFetcher()

	const handleIntegrationChange = (integrationId: string) => {
		setSelectedIntegration(integrationId)
		setSelectedChannel('')
		setAvailableChannels([])

		// Fetch channels for the selected integration
		if (integrationId) {
			setIsLoadingChannels(true)

			// Use fetcher to get channels
			const formData = new FormData()
			formData.append('intent', 'get-integration-channels')
			formData.append('integrationId', integrationId)

			channelsFetcher.submit(formData, { method: 'POST' })
		}
	}

	// Handle channels fetcher response
	React.useEffect(() => {
		if (channelsFetcher.data && channelsFetcher.state === 'idle') {
			setIsLoadingChannels(false)

			if (channelsFetcher.data.channels) {
				setAvailableChannels(channelsFetcher.data.channels)
			} else if (channelsFetcher.data.error) {
				console.error('Error fetching channels:', channelsFetcher.data.error)
				// Fall back to empty array
				setAvailableChannels([])
			}
		}
	}, [channelsFetcher.data, channelsFetcher.state])

	const handleConnect = () => {
		if (selectedIntegration && selectedChannel) {
			onConnect(selectedIntegration, selectedChannel)
		}
	}

	const canConnect = selectedIntegration && selectedChannel && !isConnecting

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<label className="text-sm font-medium">Service</label>
				<Select
					value={selectedIntegration}
					onValueChange={handleIntegrationChange}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select a service" />
					</SelectTrigger>
					<SelectContent>
						{integrations.map((integration) => (
							<SelectItem key={integration.id} value={integration.id}>
								<div className="flex items-center space-x-2">
									<span className="capitalize">{integration.providerName}</span>
									{!integration.isActive && (
										<Badge variant="secondary" className="text-xs">
											Inactive
										</Badge>
									)}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selectedIntegration && (
				<div className="space-y-2">
					<label className="text-sm font-medium">Channel</label>
					<p className="text-muted-foreground text-xs">
						Note: The bot may need to be invited to private channels before it
						can post messages.
					</p>
					<Select
						value={selectedChannel}
						onValueChange={setSelectedChannel}
						disabled={isLoadingChannels}
					>
						<SelectTrigger>
							<SelectValue
								placeholder={
									isLoadingChannels
										? 'Loading channels...'
										: availableChannels.length === 0
											? 'No channels available'
											: 'Select a channel'
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{isLoadingChannels ? (
								<SelectItem value="loading" disabled>
									<div className="flex items-center space-x-2">
										<Icon name="update" className="h-3 w-3 animate-spin" />
										<span>Loading channels...</span>
									</div>
								</SelectItem>
							) : availableChannels.length === 0 ? (
								<SelectItem value="no-channels" disabled>
									<div className="flex items-center space-x-2">
										<Icon name="cross-1" className="h-3 w-3" />
										<span>No channels available</span>
									</div>
								</SelectItem>
							) : (
								availableChannels.map((channel) => (
									<SelectItem key={channel.id} value={channel.id}>
										<div className="flex items-center space-x-2">
											<span>#{channel.name}</span>
											<Badge
												variant={
													channel.type === 'private' ? 'secondary' : 'outline'
												}
												className="text-xs"
											>
												{channel.type}
											</Badge>
											{channel.metadata?.member_count && (
												<span className="text-muted-foreground text-xs">
													{channel.metadata.member_count} members
												</span>
											)}
											{channel.metadata?.bot_needs_invite && (
												<Badge variant="outline" className="text-xs">
													Bot needs invite
												</Badge>
											)}
										</div>
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				</div>
			)}

			<StatusButton
				onClick={handleConnect}
				disabled={!canConnect}
				status={isConnecting ? 'pending' : 'idle'}
				className="w-full"
			>
				Connect to Channel
			</StatusButton>
		</div>
	)
}
