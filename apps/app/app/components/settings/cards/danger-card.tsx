import { Trans } from '@lingui/macro'
import {
	Frame,
	FramePanel,
	FrameDescription,
	FrameHeader,
	FrameTitle,
} from '@repo/ui/frame'
import { DeleteData } from '#app/components/settings/account-management.tsx'

interface DangerCardProps {
	user: {
		id: string
		email: string
	}
}

export function DangerCard({ user: _user }: DangerCardProps) {
	return (
		<Frame className="border-destructive/20 bg-destructive/5 dark:bg-destructive/30 w-full">
			<FrameHeader>
				<FrameTitle className="text-destructive">
					<Trans>Danger</Trans>
				</FrameTitle>
				<FrameDescription>
					<Trans>Destructive settings that cannot be undone.</Trans>
				</FrameDescription>
			</FrameHeader>
			<FramePanel>
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
			</FramePanel>
		</Frame>
	)
}
