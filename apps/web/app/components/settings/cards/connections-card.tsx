import { Connections } from '#app/components/settings/connections.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'

export const disconnectProviderActionIntent = 'disconnect-provider'

interface ConnectionsCardProps {
	connections: Array<{
		id: string
		providerName: string
		providerId: string
		createdAt: Date
	}>
	user: {
		id: string
		name: string | null
		username: string
		email: string
	}
}

export function ConnectionsCard({ connections }: ConnectionsCardProps) {
	if (connections.length === 0) return null

	return (
		<Card className="w-full">
			<CardContent>
				<Connections data={{ connections }} />
			</CardContent>
		</Card>
	)
}
