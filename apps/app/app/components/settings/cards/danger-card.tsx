import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui'
import { Trans } from '@lingui/macro'
import { DeleteData } from '#app/components/settings/account-management.tsx'

interface DangerCardProps {
	user: {
		id: string
		email: string
	}
}

export function DangerCard({ user }: DangerCardProps) {
	return (
		<Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/30 w-full">
			<CardHeader>
				<CardTitle className="text-destructive">
					<Trans>Danger</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Destructive settings that cannot be undone.</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex justify-between">
					<div>
						<h3 className="text-foreground mb-2 font-medium">
							<Trans>Delete account</Trans>
						</h3>
						<p className="text-muted-foreground text-sm">
							<Trans>
								Deleting your user will permanently delete all user data. You
								should download any data that you wish to retain.
							</Trans>
						</p>
					</div>
					<DeleteData />
				</div>
			</CardContent>
		</Card>
	)
}
