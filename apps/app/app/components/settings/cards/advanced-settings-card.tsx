import { Link } from 'react-router'
import { Trans } from '@lingui/macro'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Icon,
} from '@repo/ui'
import { SignOutOfSessions } from '#app/components/settings/account-management.tsx'

export const signOutOfSessionsActionIntent = 'sign-out-of-sessions'

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
				<CardTitle>
					<Trans>Advanced Settings</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Manage your sessions and download your data.</Trans>
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
							<Trans>Download your data</Trans>
						</Link>
					</div>
					<SignOutOfSessions data={{ user }} />
				</div>
			</CardContent>
		</Card>
	)
}
