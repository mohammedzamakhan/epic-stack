import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@repo/ui/item'
import { useState } from 'react'
import {
	Link,
	redirect,
	useFetcher,
	useLoaderData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import { getOperatorTenantClient } from '#app/utils/tenant-api.server.ts'

const STATUS_FILTERS = ['all', 'active', 'draft', 'paused'] as const

export interface JourneyListItem {
	id: string
	name: string
	description?: string | null
	status: 'draft' | 'active' | 'paused' | 'archived'
	triggerType: string
	stepCount: number
	runsCount: number
	updatedAt: string
	createdAt: string
}

function JourneyStatusBadge({ status }: { status: JourneyListItem['status'] }) {
	return (
		<Badge
			variant="outline"
			className={cn(
				'shrink-0 text-[10px] font-semibold capitalize',
				status === 'active' &&
					'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
				status === 'draft' && 'bg-muted text-muted-foreground border-border',
				status === 'paused' &&
					'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
				status === 'archived' &&
					'bg-destructive/10 text-destructive border-destructive/30',
			)}
		>
			{status}
		</Badge>
	)
}

function formatTriggerType(triggerType: string) {
	return triggerType.replaceAll('_', ' ')
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)

	try {
		const res = await fetchTenant('/operator/journeys')
		if (!res.ok) {
			return {
				journeys: [] as JourneyListItem[],
				orgSlug,
				error: 'Failed to load journeys from regional tenant storage.',
			}
		}

		const data = (await res.json()) as {
			journeys?: Array<Record<string, unknown>>
		}
		const journeys: JourneyListItem[] = (data.journeys ?? []).map((j) => ({
			id: String(j.id),
			name: String(j.name),
			description: j.description as string | null | undefined,
			status: j.status as JourneyListItem['status'],
			triggerType: String(j.triggerType || 'customer_signup'),
			stepCount: Array.isArray(j.nodes) ? j.nodes.length : 0,
			runsCount: Number(j.runsCount) || 0,
			updatedAt: String(j.updatedAt || j.createdAt || new Date().toISOString()),
			createdAt: String(j.createdAt || new Date().toISOString()),
		}))

		return {
			journeys,
			orgSlug,
			error: null,
		}
	} catch (err) {
		return {
			journeys: [] as JourneyListItem[],
			orgSlug,
			error: err instanceof Error ? err.message : 'Database connection error',
		}
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const journeyId = formData.get('journeyId')

	if (typeof journeyId !== 'string' || !journeyId) {
		return { error: 'journeyId is required' }
	}

	if (intent === 'publish') {
		const res = await fetchTenant(`/operator/journeys/${journeyId}/publish`, {
			method: 'POST',
		})
		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			return {
				error: (err as { error?: string }).error || 'Failed to publish journey',
			}
		}
		return { success: true }
	}

	if (intent === 'pause') {
		const res = await fetchTenant(`/operator/journeys/${journeyId}/pause`, {
			method: 'POST',
		})
		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			return {
				error: (err as { error?: string }).error || 'Failed to pause journey',
			}
		}
		return { success: true }
	}

	if (intent === 'delete') {
		const res = await fetchTenant(`/operator/journeys/${journeyId}`, {
			method: 'DELETE',
		})
		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			return {
				error: (err as { error?: string }).error || 'Failed to delete journey',
			}
		}
		return { success: true }
	}

	if (intent === 'duplicate') {
		const getRes = await fetchTenant(`/operator/journeys/${journeyId}`)
		if (!getRes.ok) return { error: 'Failed to find original journey' }
		const orig = (await getRes.json()) as {
			journey?: {
				name?: string
				description?: string
				triggerType?: string
				nodes?: unknown[]
				edges?: unknown[]
				graphJson?: unknown
			}
		}

		const createRes = await fetchTenant('/operator/journeys', {
			method: 'POST',
			body: JSON.stringify({
				name: `${orig.journey?.name || 'Journey'} (Copy)`,
				description: orig.journey?.description,
				triggerType: orig.journey?.triggerType,
				nodes: orig.journey?.nodes || [],
				edges: orig.journey?.edges || [],
				graphJson: orig.journey?.graphJson,
			}),
		})

		if (!createRes.ok) {
			const err = await createRes.json().catch(() => ({}))
			return {
				error:
					(err as { error?: string }).error || 'Failed to duplicate journey',
			}
		}

		const created = (await createRes.json()) as { journey?: { id?: string } }
		return redirect(
			`/${orgSlug}/marketing/automations/${created.journey?.id || ''}`,
		)
	}

	return { error: 'Unknown intent' }
}

export default function JourneysList() {
	const { journeys, orgSlug, error } = useLoaderData<typeof loader>()
	const fetcher = useFetcher()
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')

	const filteredJourneys = journeys.filter((journey) => {
		const matchesSearch =
			journey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(journey.description &&
				journey.description.toLowerCase().includes(searchQuery.toLowerCase()))
		const matchesStatus =
			statusFilter === 'all' || journey.status === statusFilter
		return matchesSearch && matchesStatus
	})

	const hasFilters = searchQuery.length > 0 || statusFilter !== 'all'

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<header className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
					<p className="text-muted-foreground text-sm">
						Event-driven workflows with triggers, delays, and actions.
					</p>
				</header>
				<Button
					render={<Link to={`/${orgSlug}/marketing/automations/new`} />}
					className="shrink-0 gap-2"
				>
					<Icon name="plus" className="size-4" />
					New automation
				</Button>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative max-w-sm flex-1">
					<Icon
						name="search"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input
						placeholder="Search automations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-9 pl-9"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-1">
					{STATUS_FILTERS.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={cn(
								'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
								statusFilter === status
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							{status}
						</button>
					))}
				</div>
			</div>

			{error ? (
				<p className="text-destructive text-sm">{error}</p>
			) : filteredJourneys.length === 0 ? (
				<EmptyState
					title="No automations found"
					description={
						hasFilters
							? 'Try adjusting your search or filter.'
							: 'Create your first marketing automation.'
					}
					icons={['play', 'route', 'clock']}
					action={
						!hasFilters
							? {
									label: 'Create automation',
									href: `/${orgSlug}/marketing/automations/new`,
								}
							: undefined
					}
				/>
			) : (
				<ItemGroup>
					{filteredJourneys.map((journey) => (
						<Item key={journey.id} variant="outline" size="sm">
							<ItemContent>
								<Link
									to={`/${orgSlug}/marketing/automations/${journey.id}`}
									className="min-w-0"
								>
									<ItemTitle>{journey.name}</ItemTitle>
									<ItemDescription>
										<span className="capitalize">
											{formatTriggerType(journey.triggerType)}
										</span>
										{' · '}
										{journey.stepCount} steps
										{' · '}
										{journey.runsCount} runs
									</ItemDescription>
								</Link>
							</ItemContent>

							<ItemActions>
								<JourneyStatusBadge status={journey.status} />

								<Button
									render={
										<Link
											to={`/${orgSlug}/marketing/automations/${journey.id}/runs`}
										/>
									}
									variant="ghost"
									size="sm"
									className="text-muted-foreground size-8 p-0"
									title="View run history"
								>
									<Icon name="clock" className="size-4" />
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												variant="ghost"
												size="sm"
												className="text-muted-foreground size-8 p-0"
												title="More actions"
											>
												<Icon name="ellipsis" className="size-4" />
											</Button>
										}
									/>
									<DropdownMenuContent align="end">
										{journey.status === 'draft' ||
										journey.status === 'paused' ? (
											<DropdownMenuItem
												onClick={() => {
													void fetcher.submit(
														{ intent: 'publish', journeyId: journey.id },
														{ method: 'POST' },
													)
												}}
											>
												Publish
											</DropdownMenuItem>
										) : journey.status === 'active' ? (
											<DropdownMenuItem
												onClick={() => {
													void fetcher.submit(
														{ intent: 'pause', journeyId: journey.id },
														{ method: 'POST' },
													)
												}}
											>
												Pause
											</DropdownMenuItem>
										) : null}

										<DropdownMenuItem
											onClick={() => {
												void fetcher.submit(
													{ intent: 'duplicate', journeyId: journey.id },
													{ method: 'POST' },
												)
											}}
										>
											Duplicate
										</DropdownMenuItem>

										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={() => {
												if (
													confirm(
														`Are you sure you want to delete "${journey.name}"?`,
													)
												) {
													void fetcher.submit(
														{ intent: 'delete', journeyId: journey.id },
														{ method: 'POST' },
													)
												}
											}}
										>
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	)
}
