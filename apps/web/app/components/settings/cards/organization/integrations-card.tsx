import { useFetcher, Form } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#app/components/ui/card'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { StatusButton } from '#app/components/ui/status-button'
import { Badge } from '#app/components/ui/badge'

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

export function IntegrationsCard({ integrations, availableProviders }: IntegrationsCardProps) {
  const fetcher = useFetcher()

  const connectedProviders = new Set(integrations.map(i => i.providerName))
  const availableToConnect = availableProviders.filter(p => !connectedProviders.has(p.name))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Third-Party Integrations</CardTitle>
        <CardDescription>
          Connect your organization to external services to sync notes and collaborate across platforms.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Connected Services</h4>
            <div className="space-y-3">
              {integrations.map((integration) => (
                <ConnectedIntegrationItem
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
            <h4 className="text-sm font-medium text-muted-foreground">
              {integrations.length > 0 ? 'Available Services' : 'Connect a Service'}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="text-center py-8">
            <Icon name="link-2" className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-sm font-medium text-muted-foreground">No integrations available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Contact your administrator to enable integrations for your organization.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ConnectedIntegrationItemProps {
  integration: Integration
  isDisconnecting: boolean
}

function ConnectedIntegrationItem({ integration, isDisconnecting }: ConnectedIntegrationItemProps) {
  const fetcher = useFetcher()
  const providerInfo = getProviderInfo(integration.providerName)
  const connectionCount = integration._count?.connections || 0
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Icon 
            name="link-2"
            className="h-8 w-8 text-muted-foreground" 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-foreground truncate">
              {providerInfo.displayName}
            </p>
            <Badge 
              variant={integration.isActive ? "default" : "secondary"}
              className="text-xs"
            >
              {integration.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-xs text-muted-foreground">
              {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
            </p>
            {integration.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
      <fetcher.Form method="POST">
        <input type="hidden" name="intent" value={disconnectIntegrationActionIntent} />
        <input type="hidden" name="integrationId" value={integration.id} />
        <StatusButton
          type="submit"
          variant="outline"
          size="sm"
          status={isDisconnecting ? 'pending' : 'idle'}
          className="text-destructive hover:text-destructive"
        >
          Disconnect
        </StatusButton>
      </fetcher.Form>
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
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Icon 
            name="link-2"
            className="h-8 w-8 text-muted-foreground" 
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {provider.displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {provider.description}
          </p>
        </div>
      </div>
      <Form method="POST">
        <input type="hidden" name="intent" value={connectIntegrationActionIntent} />
        <input type="hidden" name="providerName" value={provider.name} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
        >
          Connect
        </Button>
      </Form>
    </div>
  )
}

// Helper function to get provider display information
function getProviderInfo(providerName: string) {
  const providers = {
    slack: {
      displayName: 'Slack',
      icon: 'link-2', // We'll use a generic icon for now
      description: 'Team communication and collaboration'
    },
    teams: {
      displayName: 'Microsoft Teams',
      icon: 'link-2',
      description: 'Video meetings and team chat'
    },
    jira: {
      displayName: 'Jira',
      icon: 'link-2',
      description: 'Issue and project tracking'
    }
  } as const

  return providers[providerName as keyof typeof providers] || {
    displayName: providerName,
    icon: 'link-2',
    description: 'Third-party service integration'
  }
}