import { requireUserWithRole } from '@repo/auth'
import { CampaignListGrid } from '@repo/marketing'
import { listPlatformCampaigns } from '@repo/marketing/server/platform-campaigns'
import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { useState } from 'react'
import { Link, type LoaderFunctionArgs, useLoaderData } from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const campaigns = await listPlatformCampaigns()
	return { campaigns, error: null }
}

export default function AdminCampaignsIndexRoute() {
	const { campaigns, error } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')

	const filteredCampaigns = campaigns.filter((campaign) => {
		const matchesSearch = campaign.name
			.toLowerCase()
			.includes(searchQuery.toLowerCase())
		const matchesStatus =
			statusFilter === 'all' || campaign.status.toLowerCase() === statusFilter
		return matchesSearch && matchesStatus
	})

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-b pb-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Platform Broadcasts
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Send one-time emails to tenant operators.
					</p>
				</div>
				<Button
					render={<Link to="/marketing/campaigns/new" />}
					className="gap-2"
				>
					<Icon name="plus" className="size-4" />
					New Broadcast
				</Button>
			</div>

			<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
				<Input
					placeholder="Search campaigns..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="h-9 max-w-md"
				/>
				<div className="bg-card flex items-center gap-1 rounded-lg border p-1">
					{['all', 'completed', 'processing', 'failed'].map((st) => (
						<button
							key={st}
							type="button"
							onClick={() => setStatusFilter(st)}
							className={cn(
								'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
								statusFilter === st
									? 'bg-primary text-primary-foreground font-semibold shadow-xs'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							{st}
						</button>
					))}
				</div>
			</div>

			{error && (
				<div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm">
					{error}
				</div>
			)}

			{filteredCampaigns.length === 0 ? (
				<EmptyState
					title="No broadcasts found"
					description="Create your first platform email campaign for tenant operators."
					icons={['mail', 'send']}
					action={{
						label: 'Create Broadcast',
						href: '/marketing/campaigns/new',
					}}
				/>
			) : (
				<CampaignListGrid
					campaigns={filteredCampaigns}
					getCampaignHref={(campaign) => `/marketing/campaigns/${campaign.id}`}
				/>
			)}
		</div>
	)
}
