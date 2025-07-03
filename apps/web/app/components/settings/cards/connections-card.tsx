import { Connections } from '#app/components/settings/connections.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#app/components/ui/card.tsx'

export const disconnectProviderActionIntent = 'disconnect-provider'

interface ConnectionsCardProps {
  connections: Array<{
    id: string
    providerName: string
    providerId: string
    createdAt: string
  }>
  user: {
    id: string
    name: string | null
    username: string
    email: string
  }
}

export function ConnectionsCard({ connections, user }: ConnectionsCardProps) {
  if (connections.length === 0) return null

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-muted">
        <CardTitle className="text-xl">Connected Accounts</CardTitle>
        <CardDescription>Manage your connections to external services</CardDescription>
      </CardHeader>
      <CardContent>
        <Connections data={{ connections, user }} />
      </CardContent>
    </Card>
  )
}
