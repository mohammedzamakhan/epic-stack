import { Trans } from '@lingui/macro'
import { formatDate } from '@repo/common'
import { Button } from '@repo/ui/button'
import {
	Frame,
	FramePanel,
	FrameDescription,
	FrameHeader,
	FrameTitle,
} from '@repo/ui/frame'
import { Icon } from '@repo/ui/icon'
import { Link } from 'react-router'

interface PrivacyCardProps {
	gdpr: {
		latestExportRequest: {
			id: string
			status: string
			completedAt: string | undefined
			requestedAt: string
		} | null
	}
}

export function PrivacyCard({ gdpr }: PrivacyCardProps) {
	const lastExportDateFormatted = gdpr.latestExportRequest?.completedAt
		? formatDate(gdpr.latestExportRequest.completedAt)
		: ''

	return (
		<Frame className="w-full">
			<FrameHeader>
				<FrameTitle>
					<Trans>Privacy & Data Rights</Trans>
				</FrameTitle>
				<FrameDescription>
					<Trans>
						Manage your personal data in accordance with GDPR Article 20.
					</Trans>
				</FrameDescription>
			</FrameHeader>
			<FramePanel>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<h3 className="text-foreground mb-2 font-medium">
							<Trans>Download your data</Trans>
						</h3>
						<p className="text-muted-foreground text-sm text-pretty">
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
						className="shrink-0 self-start"
						render={<Link to="/resources/download-user-data" reloadDocument />}
					>
						<Icon name="download" />
						<Trans>Export data</Trans>
					</Button>
				</div>
			</FramePanel>
		</Frame>
	)
}
