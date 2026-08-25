import { requireUserWithRole } from '@repo/auth'
import { CampaignStatusBadge, type CampaignListItem } from '@repo/marketing'
import {
	getPlatformMarketingMetrics,
	listPlatformCampaigns,
} from '@repo/marketing/server/platform-campaigns'
import { Icon, type IconName } from '@repo/ui/icon'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@repo/ui/item'
import { Link, type LoaderFunctionArgs, useLoaderData } from 'react-router'

const QUICK_LINKS: Array<{
	to: string
	icon: IconName
	title: string
	description: string
}> = [
	{
		to: '/marketing/campaigns',
		icon: 'send',
		title: 'Broadcasts',
		description: 'Email tenant operators',
	},
	{
		to: '/marketing/automations',
		icon: 'route',
		title: 'Automations',
		description: 'Platform lifecycle workflows',
	},
]

const METRIC_ITEMS = [
	{
		key: 'emailsSent',
		label: 'Emails sent',
		format: (metrics: { emailsSent: number }) =>
			metrics.emailsSent.toLocaleString(),
	},
	{
		key: 'openRate',
		label: 'Open rate',
		format: (metrics: { openRate: string }) => `${metrics.openRate}%`,
	},
	{
		key: 'clickRate',
		label: 'Click rate',
		format: (metrics: { clickRate: string }) => `${metrics.clickRate}%`,
	},
	{
		key: 'activeCampaigns',
		label: 'Active campaigns',
		format: (metrics: { activeCampaigns: number }) =>
			String(metrics.activeCampaigns),
	},
] as const

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const [metrics, campaigns] = await Promise.all([
		getPlatformMarketingMetrics(),
		listPlatformCampaigns(),
	])

	return { metrics, campaigns: campaigns.slice(0, 5) as CampaignListItem[] }
}

export default function MarketingOverviewRoute() {
	const { metrics, campaigns } = useLoaderData<typeof loader>()

	return (
		<div className="space-y-8">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">
					Platform marketing
				</h1>
				<p className="text-muted-foreground text-sm">
					Broadcasts and automations for tenant operators.
				</p>
			</header>

			<ItemGroup className="grid gap-3 sm:grid-cols-2">
				{QUICK_LINKS.map((item) => (
					<Item key={item.to} variant="outline" render={<Link to={item.to} />}>
						<ItemMedia variant="icon">
							<Icon name={item.icon} className="size-4" />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{item.title}</ItemTitle>
							<ItemDescription>{item.description}</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Icon
								name="chevron-right"
								className="text-muted-foreground size-4 shrink-0"
							/>
						</ItemActions>
					</Item>
				))}
			</ItemGroup>

			<section aria-label="Performance metrics">
				<ItemGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{METRIC_ITEMS.map((item) => (
						<Item key={item.key} variant="outline" size="sm">
							<ItemContent>
								<ItemDescription>{item.label}</ItemDescription>
								<p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
									{item.format(metrics)}
								</p>
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</section>

			<section aria-labelledby="recent-campaigns-heading">
				<div className="mb-3 flex items-center justify-between gap-4">
					<h2 id="recent-campaigns-heading" className="text-sm font-medium">
						Recent campaigns
					</h2>
					<Link
						to="/marketing/campaigns"
						className="text-muted-foreground hover:text-foreground text-xs transition-colors"
					>
						View all
					</Link>
				</div>

				{campaigns.length === 0 ? (
					<div className="px-4 py-10 text-center">
						<p className="text-muted-foreground text-sm">No campaigns yet.</p>
						<Link
							to="/marketing/campaigns/new"
							className="text-foreground mt-2 inline-block text-sm underline-offset-4 hover:underline"
						>
							Create your first broadcast
						</Link>
					</div>
				) : (
					<ItemGroup>
						{campaigns.map((campaign) => (
							<Item
								key={campaign.id}
								variant="outline"
								size="sm"
								render={<Link to={`/marketing/campaigns/${campaign.id}`} />}
							>
								<ItemContent>
									<ItemTitle>{campaign.name}</ItemTitle>
									<ItemDescription>
										{campaign.targetAudienceCount.toLocaleString()} recipients
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<CampaignStatusBadge status={campaign.status} />
								</ItemActions>
							</Item>
						))}
					</ItemGroup>
				)}
			</section>
		</div>
	)
}
