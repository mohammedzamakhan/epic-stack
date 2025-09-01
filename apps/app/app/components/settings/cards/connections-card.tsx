import { Connections } from '#app/components/settings/connections.tsx'
import {
	ProviderConnectionForm,
	providerNames,
} from '#app/utils/connections.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui'

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
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Connected Accounts</CardTitle>
				<CardDescription>Manage your connected accounts here.</CardDescription>
			</CardHeader>
			<CardContent>
				<Connections data={{ connections }} />
				<div className="border-border mt-5 flex flex-col gap-5 border-t-2 border-b-2 py-3">
					<h3 className="text-center text-sm font-medium">
						Add more connections
					</h3>
					{providerNames.map((providerName) => (
						<ProviderConnectionForm
							key={providerName}
							type="Connect"
							providerName={providerName}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
