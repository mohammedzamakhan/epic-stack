import { Trans } from '@lingui/macro'
import { useDoubleCheck } from '@repo/common'
import { Button } from '@repo/ui/button'
import {
	Frame,
	FramePanel,
	FrameDescription,
	FrameHeader,
	FrameTitle,
} from '@repo/ui/frame'
import { Icon } from '@repo/ui/icon'
import { StatusButton } from '@repo/ui/status-button'
import { useFetcher, Link } from 'react-router'
import {
	requestDataDeletionActionIntent,
	cancelDataDeletionActionIntent,
} from '#app/routes/_app+/security.tsx'

interface PrivacyCardProps {
	gdpr: {
		activeErasureRequest: {
			id: string
			status: string
			scheduledFor: string | undefined
			requestedAt: string
		} | null
		latestExportRequest: {
			id: string
			status: string
			completedAt: string | undefined
			requestedAt: string
		} | null
	}
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date)
}

export function PrivacyCard({ gdpr }: PrivacyCardProps) {
	const dc = useDoubleCheck()
	const deletionFetcher = useFetcher()
	const cancelFetcher = useFetcher()

	const hasActiveErasureRequest = gdpr.activeErasureRequest !== null
	const scheduledDate = gdpr.activeErasureRequest?.scheduledFor
		? new Date(gdpr.activeErasureRequest.scheduledFor)
		: null
	const deletionDateFormatted = scheduledDate ? formatDate(scheduledDate) : ''
	const lastExportDateFormatted = gdpr.latestExportRequest?.completedAt
		? formatDate(new Date(gdpr.latestExportRequest.completedAt))
		: ''

	return (
		<Frame className="w-full">
			<FrameHeader>
				<FrameTitle>
					<Trans>Privacy & Data Rights</Trans>
				</FrameTitle>
				<FrameDescription>
					<Trans>
						Manage your personal data in accordance with GDPR Articles 17 & 20.
					</Trans>
				</FrameDescription>
			</FrameHeader>
			<FramePanel>
				<div className="space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1">
							<h3 className="text-foreground mb-2 font-medium">
								<Trans>Download your data</Trans>
							</h3>
							<p className="text-muted-foreground text-sm">
								<Trans>
									Download a copy of all your personal data including notes,
									profile information, and account activity (GDPR Article 20 -
									Right to Portability).
								</Trans>
							</p>
							{lastExportDateFormatted && (
								<p className="text-muted-foreground mt-2 text-xs">
									<Trans>Last exported: {lastExportDateFormatted}</Trans>
								</p>
							)}
						</div>
						<Button
							variant="outline"
							render={
								<Link to="/resources/download-user-data" reloadDocument />
							}
						>
							<Icon name="download" />
							<Trans>Export data</Trans>
						</Button>
					</div>

					<div className="border-border border-t pt-6">
						<div className="flex items-start justify-between gap-4">
							<div className="flex-1">
								<h3 className="text-foreground mb-2 font-medium">
									<Trans>Request account deletion</Trans>
								</h3>
								{hasActiveErasureRequest && scheduledDate ? (
									<div className="space-y-2">
										<p className="text-destructive text-sm font-medium">
											<Trans>
												Your account is scheduled for deletion on{' '}
												{deletionDateFormatted}.
											</Trans>
										</p>
										<p className="text-muted-foreground text-sm">
											<Trans>
												You can cancel this request before the scheduled date to
												keep your account. After deletion, all your data will be
												permanently removed.
											</Trans>
										</p>
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										<Trans>
											Request permanent deletion of your account and all
											associated data (GDPR Article 17 - Right to Erasure). A
											7-day grace period allows you to cancel if needed.
										</Trans>
									</p>
								)}
							</div>
							<div className="flex items-center gap-2">
								{hasActiveErasureRequest ? (
									<cancelFetcher.Form method="POST">
										<StatusButton
											type="submit"
											name="intent"
											value={cancelDataDeletionActionIntent}
											variant="outline"
											status={
												cancelFetcher.state !== 'idle' ? 'pending' : 'idle'
											}
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
											status={
												deletionFetcher.state !== 'idle' ? 'pending' : 'idle'
											}
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
					</div>
				</div>
			</FramePanel>
		</Frame>
	)
}
