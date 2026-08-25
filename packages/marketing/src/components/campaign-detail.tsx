import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@repo/ui/item'
import { Link } from 'react-router'
import { CampaignStatusBadge } from './campaign-list.tsx'
import { type CampaignDetail } from '../types/campaign.ts'

function formatAudience(audience?: string | null) {
	if (!audience) return 'All recipients'
	return audience
		.replaceAll('_', ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase())
}

function recipientContact(recipient: CampaignDetail['recipients'][number]) {
	if (recipient.email) return recipient.email
	if (recipient.phone) return recipient.phone
	return 'No contact on file'
}

function recipientEngagement(recipient: CampaignDetail['recipients'][number]) {
	if (recipient.clickedAt) {
		return `Clicked ${new Date(recipient.clickedAt).toLocaleString()}`
	}
	if (recipient.openedAt) {
		return `Opened ${new Date(recipient.openedAt).toLocaleString()}`
	}
	return null
}

export function CampaignDetailView({
	campaign,
	backHref,
	backLabel = 'Back to broadcasts',
}: {
	campaign: CampaignDetail
	backHref: string
	backLabel?: string
}) {
	return (
		<div className="space-y-8">
			<div className="space-y-4">
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground -ml-2 gap-1.5"
					render={<Link to={backHref} />}
				>
					<Icon name="arrow-left" className="size-4" />
					{backLabel}
				</Button>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-tight">
								{campaign.name}
							</h1>
							<CampaignStatusBadge status={campaign.status} />
						</div>
						<p className="text-muted-foreground text-sm">
							<span className="capitalize">{campaign.channel}</span>
							{' · '}
							{formatAudience(campaign.audience)}
							{' · '}
							Sent {new Date(campaign.createdAt).toLocaleString()}
						</p>
					</div>
				</div>
			</div>

			<section className="space-y-3" aria-labelledby="campaign-message-heading">
				<h2 id="campaign-message-heading" className="text-sm font-medium">
					Message
				</h2>
				<div className="rounded-lg border p-4">
					{campaign.channel === 'email' && campaign.subject ? (
						<p className="text-sm font-medium">{campaign.subject}</p>
					) : null}
					<p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
						{campaign.content}
					</p>
				</div>
			</section>

			<section
				className="space-y-3"
				aria-labelledby="campaign-recipients-heading"
			>
				<div className="flex items-center justify-between gap-4">
					<h2 id="campaign-recipients-heading" className="text-sm font-medium">
						Recipients
					</h2>
					<p className="text-muted-foreground text-xs">
						{campaign.recipients.length.toLocaleString()} of{' '}
						{campaign.targetAudienceCount.toLocaleString()} targeted
					</p>
				</div>

				{campaign.recipients.length === 0 ? (
					<div className="rounded-lg border border-dashed px-4 py-10 text-center">
						<p className="text-muted-foreground text-sm">
							No delivery records yet.
						</p>
					</div>
				) : (
					<ItemGroup>
						{campaign.recipients.map((recipient) => {
							const engagement = recipientEngagement(recipient)
							return (
								<Item key={recipient.id} variant="outline" size="sm">
									<ItemContent>
										<ItemTitle>
											{recipient.name || 'Unnamed recipient'}
										</ItemTitle>
										<ItemDescription>
											{recipientContact(recipient)}
											{recipient.sentAt
												? ` · Sent ${new Date(recipient.sentAt).toLocaleString()}`
												: ''}
											{engagement ? ` · ${engagement}` : ''}
										</ItemDescription>
									</ItemContent>
									<Badge variant="outline" className="text-[10px] capitalize">
										{recipient.status}
									</Badge>
								</Item>
							)
						})}
					</ItemGroup>
				)}
			</section>
		</div>
	)
}
