import { Link } from 'react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Icon,
} from '@repo/ui'
import {
	DeleteData,
	SignOutOfSessions,
} from '#app/components/settings/account-management.tsx'

export const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
export const deleteDataActionIntent = 'delete-data'

interface AdvancedSettingsCardProps {
	user: {
		id: string
		email: string
		_count: {
			sessions: number
		}
	}
}

export function AdvancedSettingsCard({ user }: AdvancedSettingsCardProps) {
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Advanced Settings</CardTitle>
				<CardDescription>
					Manage your sessions and delete your account data.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-6">
					<div className="flex items-center">
						<Icon name="download" className="mr-2" />
						<Link
							reloadDocument
							download="my-epic-notes-data.json"
							to="/resources/download-user-data"
							className="hover:underline"
						>
							Download your data
						</Link>
					</div>
					<SignOutOfSessions data={{ user }} />
					<DeleteData />
				</div>
			</CardContent>
		</Card>
	)
}
