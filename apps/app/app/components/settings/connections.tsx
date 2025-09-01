import { useFetcher } from 'react-router'
import { disconnectProviderActionIntent } from '#app/routes/app+/security.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { Icon, IconName, StatusButton } from '@repo/ui'

interface Connection {
	id: string
	providerName: string
	providerId: string
	createdAt: Date
}

interface ConnectionsProps {
	data: {
		connections: Connection[]
	}
}

export function Connections({ data }: ConnectionsProps) {
	if (!data.connections.length) {
		return null
	}

	return (
		<div className="flex flex-col gap-4">
			<ul className="flex flex-col gap-4">
				{data.connections.map((connection) => (
					<li key={connection.id} className="flex items-center justify-between">
						<div className="flex gap-2">
							<Icon
								name={connection.providerName as IconName}
								className="text-background-foreground h-8 w-8"
							/>
							<div className="flex flex-col gap-0">
								<div className="font-medium capitalize">
									{connection.providerName}
								</div>
								<span className="text-muted-foreground text-xs">
									Connected on{' '}
									{new Date(connection.createdAt).toLocaleDateString()}
								</span>
							</div>
						</div>
						<DisconnectProvider connectionId={connection.id} />
					</li>
				))}
			</ul>
		</div>
	)
}

interface DisconnectProviderProps {
	connectionId: string
	children?: React.ReactNode
}

export function DisconnectProvider({
	connectionId,
	children: _children,
}: DisconnectProviderProps) {
	const dc = useDoubleCheck()
	const fetcher = useFetcher()

	return (
		<fetcher.Form method="POST">
			<input type="hidden" name="connectionId" value={connectionId} />
			<StatusButton
				{...dc.getButtonProps({
					type: 'submit',
					name: 'intent',
					value: disconnectProviderActionIntent,
				})}
				variant={dc.doubleCheck ? 'destructive' : 'outline'}
				status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				size="sm"
			>
				{dc.doubleCheck ? 'Are you sure?' : 'Disconnect'}
			</StatusButton>
		</fetcher.Form>
	)
}
