import { Trans } from '@lingui/macro'
import { useDoubleCheck, formatDate } from '@repo/common'
import {
	Frame,
	FramePanel,
	FrameDescription,
	FrameHeader,
	FrameTitle,
} from '@repo/ui/frame'
import { Icon } from '@repo/ui/icon'
import { StatusButton } from '@repo/ui/status-button'
import { useFetcher } from 'react-router'
import {
	requestDataDeletionActionIntent,
	cancelDataDeletionActionIntent,
} from '#app/routes/_app+/security.tsx'

interface DangerCardProps {
	gdpr: {
		activeErasureRequest: {
			id: string
			status: string
			scheduledFor: string | undefined
			requestedAt: string
		} | null
	}
}

export function DangerCard({ gdpr }: DangerCardProps) {
	const dc = useDoubleCheck()
	const deletionFetcher = useFetcher()
	const cancelFetcher = useFetcher()

	const hasActiveErasureRequest = gdpr.activeErasureRequest !== null
	const scheduledDate = gdpr.activeErasureRequest?.scheduledFor
		? gdpr.activeErasureRequest.scheduledFor
		: null
	const deletionDateFormatted = scheduledDate ? formatDate(scheduledDate) : ''

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
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<h3 className="text-foreground mb-2 font-medium">
							<Trans>Delete account</Trans>
						</h3>
						{hasActiveErasureRequest && scheduledDate ? (
							<div className="space-y-2">
								<p className="text-destructive text-sm font-medium">
									<Trans>
										Your account is scheduled for deletion on{' '}
										{deletionDateFormatted}.
									</Trans>
								</p>
								<p className="text-muted-foreground text-sm text-pretty">
									<Trans>
										You can cancel this request before the scheduled date to
										keep your account. After deletion, all your data will be
										permanently removed.
									</Trans>
								</p>
							</div>
						) : (
							<p className="text-muted-foreground text-sm text-pretty">
								<Trans>
									Request permanent deletion of your account and all associated
									data. A 7-day grace period allows you to cancel if needed.
								</Trans>
							</p>
						)}
					</div>
					<div className="flex shrink-0 items-center gap-2 self-start">
						{hasActiveErasureRequest ? (
							<cancelFetcher.Form method="POST">
								<StatusButton
									type="submit"
									name="intent"
									value={cancelDataDeletionActionIntent}
									variant="outline"
									status={cancelFetcher.state !== 'idle' ? 'pending' : 'idle'}
								>
									<Icon name="x" />
									<Trans>Cancel deletion</Trans>
								</StatusButton>
							</cancelFetcher.Form>
						) : (
							<deletionFetcher.Form method="POST">
								<StatusButton
									{...dc.getButtonProps({
										type: 'submit',
										name: 'intent',
										value: requestDataDeletionActionIntent,
									})}
									variant={dc.doubleCheck ? 'destructive' : 'outline'}
									status={deletionFetcher.state !== 'idle' ? 'pending' : 'idle'}
								>
									<Icon name="trash-2" />
									{dc.doubleCheck ? (
										<Trans>Confirm deletion request</Trans>
									) : (
										<Trans>Request deletion</Trans>
									)}
								</StatusButton>
							</deletionFetcher.Form>
						)}
					</div>
				</div>
			</FramePanel>
		</Frame>
	)
}
