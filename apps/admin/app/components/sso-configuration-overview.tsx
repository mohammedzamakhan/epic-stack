import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { formatDistanceToNow } from 'date-fns'

interface SSOConfigurationOverviewProps {
	_organizationId: string
	ssoConfig: {
		id: string
		providerName: string
		issuerUrl: string
		clientId: string
		scopes: string
		autoDiscovery: boolean
		pkceEnabled: boolean
		autoProvision: boolean
		defaultRole: string
		isEnabled: boolean
		lastTested: Date | null
		createdAt: Date
		updatedAt: Date
		createdBy?: {
			id: string
			name: string | null
			username: string
		} | null
	} | null
	ssoStats?: {
		totalUsers: number
		activeUsers: number
		recentLogins: number
		lastLogin: Date | null
	}
	onEdit?: () => void
	onToggleStatus?: (enabled: boolean) => void
	onTestConnection?: () => void
}

export function SSOConfigurationOverview({
	_organizationId,
	ssoConfig,
	ssoStats,
	onEdit,
	onToggleStatus,
	onTestConnection,
}: SSOConfigurationOverviewProps) {
	if (!ssoConfig) {
		return null
	}

	const isHealthy =
		ssoConfig.isEnabled &&
		ssoConfig.lastTested &&
		new Date(ssoConfig.lastTested) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours

	return (
		<div className="space-y-6">
			{/* Status Alert */}
			{!ssoConfig.isEnabled && (
				<div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
					<Icon name="alert-triangle" className="h-4 w-4" />
					<span>
						SSO is configured but currently disabled. Users cannot authenticate
						through SSO.
					</span>
				</div>
			)}

			{ssoConfig.isEnabled && !isHealthy && (
				<div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
					<Icon name="octagon-alert" className="h-4 w-4" />
					<span>
						SSO connection has not been tested recently or may be experiencing
						issues. Consider testing the connection.
					</span>
				</div>
			)}

			{/* Configuration Overview */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Icon name="shield" className="h-5 w-5" />
								SSO Configuration
								<Badge variant={ssoConfig.isEnabled ? 'default' : 'secondary'}>
									{ssoConfig.isEnabled ? 'Enabled' : 'Disabled'}
								</Badge>
							</CardTitle>
							<CardDescription>
								{ssoConfig.providerName} identity provider configuration
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={onTestConnection}>
								<Icon name="plug" className="mr-2 h-4 w-4" />
								Test Connection
							</Button>
							<Button variant="outline" size="sm" onClick={onEdit}>
								<Icon name="settings" className="mr-2 h-4 w-4" />
								Edit
							</Button>
							<Button
								variant={ssoConfig.isEnabled ? 'destructive' : 'default'}
								size="sm"
								onClick={() => onToggleStatus?.(!ssoConfig.isEnabled)}
							>
								<Icon
									name={ssoConfig.isEnabled ? 'ban' : 'check'}
									className="mr-2 h-4 w-4"
								/>
								{ssoConfig.isEnabled ? 'Disable' : 'Enable'}
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6 md:grid-cols-2">
						{/* Configuration Details */}
						<div className="space-y-4">
							<div>
								<h4 className="mb-2 text-sm font-medium">Provider Details</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Provider:</span>
										<span className="font-medium">
											{ssoConfig.providerName}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Issuer URL:</span>
										<span className="font-mono text-xs break-all">
											{ssoConfig.issuerUrl}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Client ID:</span>
										<span className="font-mono text-xs">
											{ssoConfig.clientId.slice(0, 8)}...
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Scopes:</span>
										<span className="text-xs">{ssoConfig.scopes}</span>
									</div>
								</div>
							</div>

							<div>
								<h4 className="mb-2 text-sm font-medium">Configuration</h4>
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Icon
											name={ssoConfig.autoDiscovery ? 'check' : 'x'}
											className={`h-4 w-4 ${
												ssoConfig.autoDiscovery
													? 'text-green-500'
													: 'text-red-500'
											}`}
										/>
										<span className="text-sm">Auto-Discovery</span>
									</div>
									<div className="flex items-center gap-2">
										<Icon
											name={ssoConfig.pkceEnabled ? 'check' : 'x'}
											className={`h-4 w-4 ${
												ssoConfig.pkceEnabled
													? 'text-green-500'
													: 'text-red-500'
											}`}
										/>
										<span className="text-sm">PKCE Enabled</span>
									</div>
									<div className="flex items-center gap-2">
										<Icon
											name={ssoConfig.autoProvision ? 'check' : 'x'}
											className={`h-4 w-4 ${
												ssoConfig.autoProvision
													? 'text-green-500'
													: 'text-red-500'
											}`}
										/>
										<span className="text-sm">Auto-Provision Users</span>
									</div>
								</div>
							</div>
						</div>

						{/* Status and Statistics */}
						<div className="space-y-4">
							<div>
								<h4 className="mb-2 text-sm font-medium">Status</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Last Tested:</span>
										<span>
											{ssoConfig.lastTested ? (
												<span
													className={
														isHealthy ? 'text-green-600' : 'text-orange-600'
													}
												>
													{formatDistanceToNow(new Date(ssoConfig.lastTested), {
														addSuffix: true,
													})}
												</span>
											) : (
												<span className="text-red-600">Never</span>
											)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Created:</span>
										<span>
											{formatDistanceToNow(new Date(ssoConfig.createdAt), {
												addSuffix: true,
											})}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Updated:</span>
										<span>
											{formatDistanceToNow(new Date(ssoConfig.updatedAt), {
												addSuffix: true,
											})}
										</span>
									</div>
									{ssoConfig.createdBy && (
										<div className="flex justify-between">
											<span className="text-muted-foreground">Created by:</span>
											<span>
												{ssoConfig.createdBy.name ||
													ssoConfig.createdBy.username}
											</span>
										</div>
									)}
								</div>
							</div>

							{ssoStats && (
								<div>
									<h4 className="mb-2 text-sm font-medium">Usage Statistics</h4>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Total Users:
											</span>
											<span className="font-medium">{ssoStats.totalUsers}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Active Users:
											</span>
											<span className="font-medium">
												{ssoStats.activeUsers}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Recent Logins:
											</span>
											<span className="font-medium">
												{ssoStats.recentLogins}
											</span>
										</div>
										{ssoStats.lastLogin && (
											<div className="flex justify-between">
												<span className="text-muted-foreground">
													Last Login:
												</span>
												<span>
													{formatDistanceToNow(new Date(ssoStats.lastLogin), {
														addSuffix: true,
													})}
												</span>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
