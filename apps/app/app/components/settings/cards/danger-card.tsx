import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui'
import { DeleteData } from '#app/components/settings/account-management.tsx'

interface DangerCardProps {
	user: {
		id: string
		email: string
	}
}

export function DangerCard({ user: _user }: DangerCardProps) {
	return (
		<Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/30 w-full">
			<CardHeader>
				<CardTitle className="text-destructive">Danger</CardTitle>
				<CardDescription>
					Destructive settings that cannot be undone.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex justify-between">
					<div>
						<h3 className="text-foreground mb-2 font-medium">Delete account</h3>
						<p className="text-muted-foreground text-sm">
							Deleting your user will permanently delete all user data. You
							should download any data that you wish to retain.
						</p>
					</div>
					<DeleteData />
				</div>
			</CardContent>
		</Card>
	)
}
