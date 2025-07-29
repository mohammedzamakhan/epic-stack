import { useState } from 'react'
import { useFetcher, Form } from 'react-router'
import { Badge } from '#app/components/ui/badge'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '#app/components/ui/card'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { JiraIntegrationSettings } from './jira-integration-settings'

export const connectIntegrationActionIntent = 'connect-integration'
export const disconnectIntegrationActionIntent = 'disconnect-integration'

interface Integration {
	id: string
	providerName: string
	providerType: string
	isActive: boolean
	lastSyncAt: Date | null
	config: any
	_count?: {
		connections: number
	}
}

interface IntegrationsCardProps {
	integrations: Integration[]
	availableProviders: Array<{
		name: string
		type: string
		displayName: string
		description: string
		icon: string
	}>
}

export function IntegrationsCard({
	integrations,
	availableProviders,
}: IntegrationsCardProps) {
	const fetcher = useFetcher()

	const connectedProviders = new Set(integrations.map((i) => i.providerName))
	const availableToConnect = availableProviders.filter(
		(p) => !connectedProviders.has(p.name),
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Third-Party Integrations</CardTitle>
				<CardDescription>
					Connect your organization to external services to sync notes and
					collaborate across platforms.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Connected Integrations */}
				{integrations.length > 0 && (
					<div className="space-y-4">
						<h4 className="text-muted-foreground text-sm font-medium">
							Connected Services
						</h4>
						<div className="space-y-3">
							{integrations.map((integration) => (
								<ConnectedIntegrationItem
									availableProviders={availableProviders}
									key={integration.id}
									integration={integration}
									isDisconnecting={
										fetcher.state !== 'idle' &&
										fetcher.formData?.get('integrationId') === integration.id
									}
								/>
							))}
						</div>
					</div>
				)}

				{/* Available Integrations */}
				{availableToConnect.length > 0 && (
					<div className="space-y-4">
						<h4 className="text-muted-foreground text-sm font-medium">
							{integrations.length > 0
								? 'Available Services'
								: 'Connect a Service'}
						</h4>
						<div className="flex flex-col gap-3">
							{availableToConnect.map((provider) => (
								<AvailableIntegrationItem
									key={provider.name}
									provider={provider}
								/>
							))}
						</div>
					</div>
				)}

				{/* Empty State */}
				{integrations.length === 0 && availableToConnect.length === 0 && (
					<div className="py-8 text-center">
						<Icon
							name="link-2"
							className="text-muted-foreground/50 mx-auto h-12 w-12"
						/>
						<h3 className="text-muted-foreground mt-4 text-sm font-medium">
							No integrations available
						</h3>
						<p className="text-muted-foreground mt-2 text-sm">
							Contact your administrator to enable integrations for your
							organization.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

interface ConnectedIntegrationItemProps {
	availableProviders: IntegrationsCardProps['availableProviders']
	integration: Integration
	isDisconnecting: boolean
}

function ConnectedIntegrationItem({
	integration,
	isDisconnecting,
	availableProviders,
}: ConnectedIntegrationItemProps) {
	const fetcher = useFetcher()
	const providerInfo = getProviderInfo(
		integration.providerName,
		availableProviders,
	)
	const connectionCount = integration._count?.connections || 0
	const [showSettings, setShowSettings] = useState(false)

	// Check if this is a Jira integration
	const isJira = integration.providerName === 'jira'

	return (
		<div className="overflow-hidden rounded-lg border">
			<div className="flex items-center justify-between p-4">
				<div className="flex items-center space-x-3">
					<div className="flex-shrink-0">
						<Icon name={providerInfo.icon} className="text-muted-foreground h-8 w-8" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center space-x-2">
							<p className="text-foreground truncate text-sm font-medium">
								{providerInfo.displayName}
							</p>
							<Badge
								variant={integration.isActive ? 'default' : 'secondary'}
								className="text-xs"
							>
								{integration.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
						<div className="mt-1 flex items-center space-x-4">
							<p className="text-muted-foreground text-xs">
								{connectionCount}{' '}
								{connectionCount === 1 ? 'connection' : 'connections'}
							</p>
							{integration.lastSyncAt && (
								<p className="text-muted-foreground text-xs">
									Last sync:{' '}
									{new Date(integration.lastSyncAt).toLocaleDateString()}
								</p>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					{isJira && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowSettings(!showSettings)}
						>
							{showSettings ? 'Hide Settings' : 'Settings'}
						</Button>
					)}
					<fetcher.Form method="POST">
						<input
							type="hidden"
							name="intent"
							value={disconnectIntegrationActionIntent}
						/>
						<input type="hidden" name="integrationId" value={integration.id} />
						<StatusButton
							type="submit"
							variant="outline"
							size="sm"
							status={isDisconnecting ? 'pending' : 'idle'}
						>
							Disconnect
						</StatusButton>
					</fetcher.Form>
				</div>
			</div>

			{/* Show Jira settings if this is a Jira integration and settings are expanded */}
			{isJira && showSettings && (
				<div className="bg-muted/10 border-t px-4 py-4">
					<JiraIntegrationSettings integration={integration} />
				</div>
			)}
		</div>
	)
}

interface AvailableIntegrationItemProps {
	provider: {
		name: string
		type: string
		displayName: string
		description: string
		icon: string
	}
}

function AvailableIntegrationItem({ provider }: AvailableIntegrationItemProps) {
	return (
		<div className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors">
			<div className="flex-shrink-0">
				<Icon name={provider.icon} className="text-muted-foreground h-8 w-8" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-foreground truncate text-sm font-medium">
					{provider.displayName}
				</p>
				<p className="text-muted-foreground text-xs">{provider.description}</p>
			</div>
			<div className="flex-shrink-0">
				<Form method="POST">
					<input
						type="hidden"
						name="intent"
						value={connectIntegrationActionIntent}
					/>
					<input type="hidden" name="providerName" value={provider.name} />
					<Button type="submit" variant="outline" size="sm">
						Connect
					</Button>
				</Form>
			</div>
		</div>
	)
}

// Helper function to get provider display information
function getProviderInfo(
	providerName: string,
	availableProviders: IntegrationsCardProps['availableProviders'],
) {
	const provider = availableProviders.find((p) => p.name === providerName)
	return (
		provider || {
			displayName: providerName,
			icon: 'link-2',
			description: 'Third-party service integration',
		}
	)
}
