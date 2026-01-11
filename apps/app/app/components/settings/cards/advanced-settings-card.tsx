import { Trans } from '@lingui/macro'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Link } from 'react-router'

interface AdvancedSettingsCardProps {
	user: {
		id: string
		email: string
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
					<Trans>
						Download your data and manage advanced account settings.
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-6">
					<div className="flex items-center">
						<Icon name="download" className="ltr:mr-2 rtl:ml-2" />
						<Link
							reloadDocument
							download="my-epic-notes-data.json"
							to="/resources/download-user-data"
							className="hover:underline"
						>
							<Trans>Download your data</Trans>
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
