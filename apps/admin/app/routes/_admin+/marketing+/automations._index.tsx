import { requireUserWithRole } from '@repo/auth'
import {
	deletePlatformJourney,
	duplicatePlatformJourney,
	listPlatformJourneys,
	pausePlatformJourney,
	publishPlatformJourney,
} from '@repo/marketing/server/platform-journeys'
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

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const journeys = await listPlatformJourneys()
	return { journeys, error: null }
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const formData = await request.formData()
	const intent = formData.get('intent')
	const journeyId = String(formData.get('journeyId') || '')

	try {
		if (intent === 'publish') {
			await publishPlatformJourney(journeyId)
		} else if (intent === 'pause') {
			await pausePlatformJourney(journeyId)
		} else if (intent === 'delete') {
			await deletePlatformJourney(journeyId)
		} else if (intent === 'duplicate') {
			const created = await duplicatePlatformJourney(journeyId)
			if (created?.id) {
				return redirect(`/marketing/automations/${created.id}`)
			}
		}
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : 'Action failed',
		}
	}

	return redirect('/marketing/automations')
}

export default function AdminAutomationsIndexRoute() {
	const { journeys, error } = useLoaderData<typeof loader>()
	const fetcher = useFetcher()
	const [searchQuery, setSearchQuery] = useState('')

	const filtered = journeys.filter((j) =>
		j.name.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-b pb-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Platform Automations
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Event-driven workflows for tenant operator lifecycle.
					</p>
				</div>
				<Button
					render={<Link to="/marketing/automations/new" />}
					className="gap-2"
				>
					<Icon name="plus" className="size-4" />
					New Automation
				</Button>
			</div>

			<Input
				placeholder="Search automations..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className="h-9 max-w-md"
			/>

			{error && (
				<div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm">
					{error}
				</div>
			)}

			{filtered.length === 0 ? (
				<EmptyState
					title="No automations found"
					description="Create your first platform automation workflow."
					icons={['route', 'mail']}
					action={{
						label: 'Create Automation',
						href: '/marketing/automations/new',
					}}
				/>
			) : (
				<ItemGroup>
					{filtered.map((journey) => (
						<Item key={journey.id} variant="outline" size="sm">
							<ItemContent>
								<Link
									to={`/marketing/automations/${journey.id}`}
									className="min-w-0"
								>
									<ItemTitle>{journey.name}</ItemTitle>
									<ItemDescription>
										<span className="capitalize">
											{journey.triggerType.replace(/_/g, ' ')}
										</span>
										{' · '}
										{journey.stepCount} steps · {journey.runsCount} runs
									</ItemDescription>
								</Link>
							</ItemContent>
							<ItemActions>
								<Badge variant="outline" className="text-[10px] capitalize">
									{journey.status}
								</Badge>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												variant="ghost"
												size="icon-xs"
												aria-label="Actions"
											/>
										}
									>
										<Icon name="ellipsis" className="size-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											render={
												<Link to={`/marketing/automations/${journey.id}`} />
											}
										>
											Edit
										</DropdownMenuItem>
										{journey.status !== 'active' && (
											<fetcher.Form method="post">
												<input type="hidden" name="intent" value="publish" />
												<input
													type="hidden"
													name="journeyId"
													value={journey.id}
												/>
												<DropdownMenuItem render={<button type="submit" />}>
													Publish
												</DropdownMenuItem>
											</fetcher.Form>
										)}
										{journey.status === 'active' && (
											<fetcher.Form method="post">
												<input type="hidden" name="intent" value="pause" />
												<input
													type="hidden"
													name="journeyId"
													value={journey.id}
												/>
												<DropdownMenuItem render={<button type="submit" />}>
													Pause
												</DropdownMenuItem>
											</fetcher.Form>
										)}
										<fetcher.Form method="post">
											<input type="hidden" name="intent" value="duplicate" />
											<input
												type="hidden"
												name="journeyId"
												value={journey.id}
											/>
											<DropdownMenuItem render={<button type="submit" />}>
												Duplicate
											</DropdownMenuItem>
										</fetcher.Form>
										<fetcher.Form method="post">
											<input type="hidden" name="intent" value="delete" />
											<input
												type="hidden"
												name="journeyId"
												value={journey.id}
											/>
											<DropdownMenuItem
												className="text-destructive"
												render={<button type="submit" />}
											>
												Delete
											</DropdownMenuItem>
										</fetcher.Form>
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
