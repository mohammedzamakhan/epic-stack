import { Trans } from '@lingui/macro'
import { getOrgSiteUrl } from '@repo/common/url'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Switch } from '@repo/ui/switch'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'

export const SitePublishSchema = z.object({
	sitePublished: z.enum(['true', 'false']),
	organizationId: z.string(),
})

export const sitePublishActionIntent = 'update-site-publish'

export function SiteCard({
	organization,
}: {
	organization: {
		id: string
		slug: string
		sitePublished: boolean
	}
}) {
	const [isPublished, setIsPublished] = useState(organization.sitePublished)
	const fetcher = useFetcher()
	const siteUrl = getOrgSiteUrl(organization.slug)

	const handleSwitchChange = (checked: boolean) => {
		setIsPublished(checked)
		void fetcher.submit(
			{
				intent: sitePublishActionIntent,
				organizationId: organization.id,
				sitePublished: checked ? 'true' : 'false',
			},
			{ method: 'POST' },
		)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex gap-2">
						<Switch
							checked={isPublished}
							onCheckedChange={handleSwitchChange}
							disabled={fetcher.state !== 'idle'}
						/>
						<span>
							<Trans>Organization site</Trans>
						</span>
					</CardTitle>
				</div>
				<CardDescription>
					<Trans>
						Publish a public website for your organization. Visitors can reach
						it at your org subdomain.
					</Trans>
				</CardDescription>
			</CardHeader>
			{isPublished ? (
				<CardContent>
					<div className="bg-muted flex items-start gap-2 rounded-md p-3 text-sm">
						<Icon name="link-2" className="mt-0.5 h-4 w-4 shrink-0" />
						<div className="min-w-0">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								<Trans>Public URL</Trans>
							</p>
							<a
								href={siteUrl}
								target="_blank"
								rel="noreferrer"
								className="text-primary break-all underline-offset-2 hover:underline"
							>
								{siteUrl}
							</a>
						</div>
					</div>
				</CardContent>
			) : null}
		</Card>
	)
}
