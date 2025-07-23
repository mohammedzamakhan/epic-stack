import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#app/components/ui/card'
import { Label } from '#app/components/ui/label'
import { Switch } from '#app/components/ui/switch'
import { JiraBotUserSearch } from './jira-bot-user-search'

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

interface JiraIntegrationSettingsProps {
  integration: Integration
}

export function JiraIntegrationSettings({ integration }: JiraIntegrationSettingsProps) {
  const fetcher = useFetcher()
  const [showBotUserSearch, setShowBotUserSearch] = useState(false)
  
  // Parse the integration config
  const config = typeof integration.config === 'string' 
    ? JSON.parse(integration.config)
    : integration.config
    
  const [useBotUser, setUseBotUser] = useState(config?.useBotUser || false)
  
  // Handle bot user toggle
  const handleToggleBotUser = () => {
    const newValue = !useBotUser
    setUseBotUser(newValue)
    
    // Save the setting
    updateConfig({
      useBotUser: newValue,
      // Keep existing bot user if toggling on
      botUser: newValue ? config?.botUser : undefined
    })
  }
  
  // Handle bot user selection
  const handleSelectBotUser = (user: any) => {
    // Update the integration config
    updateConfig({
      useBotUser: true,
      botUser: {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress
      }
    })
  }
  
  // Update the integration config
  const updateConfig = (configUpdates: Record<string, any>) => {
    fetcher.submit(
      {
        intent: 'update-integration-config',
        integrationId: integration.id,
        config: JSON.stringify({
          ...config,
          ...configUpdates
        })
      },
      { method: 'post', action: `/api/integrations/update-config` }
    )
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Jira Bot User Settings</CardTitle>
          <CardDescription>
            Configure how issues are created in Jira
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-bot-user">Use Bot User</Label>
              <p className="text-sm text-muted-foreground">
                Issues will be created using a bot user instead of your personal account
              </p>
            </div>
            <Switch 
              id="use-bot-user" 
              checked={useBotUser}
              onCheckedChange={handleToggleBotUser}
            />
          </div>
          
          {useBotUser && (
            <div>
              {config?.botUser ? (
                <div className="p-4 border rounded-md">
                  <h3 className="text-sm font-medium mb-1">Current Bot User</h3>
                  <p className="text-sm mb-1">
                    {config.botUser.displayName}
                    {config.botUser.emailAddress && ` (${config.botUser.emailAddress})`}
                  </p>
                  <code className="px-2 py-1 bg-muted text-xs rounded">{config.botUser.accountId}</code>
                  
                  <div className="mt-3">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBotUserSearch(true)}
                    >
                      Change Bot User
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button 
                    variant="default"
                    onClick={() => setShowBotUserSearch(true)}
                  >
                    Configure Bot User
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {showBotUserSearch && (
            <div className="mt-4">
              <JiraBotUserSearch 
                integrationId={integration.id}
                onSelectUser={handleSelectBotUser}
                initialSelectedUserId={config?.botUser?.accountId}
              />
              
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBotUserSearch(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Default Issue Type Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Issue Settings</CardTitle>
          <CardDescription>
            Configure default settings for Jira issue creation
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Existing settings can go here */}
          <p className="text-sm text-muted-foreground">
            Additional Jira settings can be configured for each note connection individually.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
