import {
	type JourneyRunRecord,
	type JourneyStepExecutionRecord,
} from '@repo/marketing-workflow'
import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@repo/ui/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { useState } from 'react'
import {
	Link,
	useLoaderData,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from 'react-router'
import { getOperatorTenantClient } from '#app/utils/tenant-api.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const journeyId = params.journeyId || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)

	const [journeyRes, runsRes] = await Promise.all([
		fetchTenant(`/operator/journeys/${journeyId}`),
		fetchTenant(`/operator/journeys/${journeyId}/runs`),
	])

	if (!journeyRes.ok) {
		throw new Response('Automation not found', { status: 404 })
	}

	const journeyData = (await journeyRes.json()) as any
	const runsData = runsRes.ok ? ((await runsRes.json()) as any) : { runs: [] }

	const runs: JourneyRunRecord[] = (runsData.runs || []).map((r: any) => ({
		id: r.id,
		journeyId: r.journeyId,
		customerId: r.customerId,
		status: r.status,
		startedAt: r.startedAt || r.createdAt,
		completedAt: r.completedAt,
		currentStepNodeId: r.currentStepNodeId,
		errorMessage: r.errorMessage,
		createdAt: r.createdAt,
	}))

	return {
		orgSlug,
		journey: {
			id: journeyData.journey.id,
			name: journeyData.journey.name,
			status: journeyData.journey.status,
			triggerType: journeyData.journey.triggerType,
		},
		runs,
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)
	const formData = await request.formData()
	const runId = formData.get('runId')

	if (typeof runId !== 'string' || !runId) {
		return { error: 'runId is required' }
	}

	const res = await fetchTenant(`/operator/journeys/runs/${runId}`)
	if (!res.ok) {
		return { error: 'Failed to load timeline' }
	}

	const data = (await res.json()) as any
	return { timeline: data.timeline || data.steps || [] }
}

function formatDuration(
	startedAt: string | Date,
	completedAt?: string | Date | null,
) {
	if (!startedAt) return '—'
	const start = new Date(startedAt).getTime()
	const end = completedAt ? new Date(completedAt).getTime() : Date.now()
	const diffSec = Math.max(0, Math.floor((end - start) / 1000))

	if (!completedAt) {
		return `${diffSec}s (running)`
	}

	if (diffSec < 60) return `${diffSec}s`
	const minutes = Math.floor(diffSec / 60)
	const remainingSec = diffSec % 60
	return `${minutes}m ${remainingSec}s`
}

export default function JourneyRunsRoute() {
	const { orgSlug, journey, runs } = useLoaderData<typeof loader>()
	const [selectedRun, setSelectedRun] = useState<JourneyRunRecord | null>(null)
	const [timeline, setTimeline] = useState<JourneyStepExecutionRecord[]>([])
	const [loadingTimeline, setLoadingTimeline] = useState(false)

	const openTimeline = async (run: JourneyRunRecord) => {
		setSelectedRun(run)
		setLoadingTimeline(true)
		try {
			const res = await fetch(
				`/${orgSlug}/marketing/automations/${journey.id}/runs`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({ runId: run.id }),
				},
			)
			const data = (await res.json()) as any
			setTimeline(data.timeline || [])
		} catch {
			setTimeline([])
		} finally {
			setLoadingTimeline(false)
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Button
							render={
								<Link to={`/${orgSlug}/marketing/automations/${journey.id}`} />
							}
							variant="ghost"
							size="sm"
							className="text-muted-foreground size-8 p-0"
						>
							<svg
								className="size-4"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<path d="m15 18-6-6 6-6" />
							</svg>
						</Button>
						<h2 className="text-foreground text-xl font-bold tracking-tight">
							{journey.name} — Execution Runs
						</h2>
						<Badge
							variant="outline"
							className={cn(
								'text-[10px] font-semibold capitalize',
								journey.status === 'active' &&
									'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
								journey.status === 'draft' && 'bg-muted text-muted-foreground',
								journey.status === 'paused' &&
									'border-amber-500/30 bg-amber-500/10 text-amber-600',
							)}
						>
							{journey.status}
						</Badge>
					</div>
					<p className="text-muted-foreground pl-10 text-xs">
						Audit trail and step execution history triggered by "
						{journey.triggerType.replace('_', ' ')}".
					</p>
				</div>

				<Button
					render={
						<Link to={`/${orgSlug}/marketing/automations/${journey.id}`} />
					}
					variant="outline"
					size="sm"
					className="gap-1.5 text-xs font-semibold"
				>
					<svg
						className="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M12 20h9" />
						<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
					</svg>
					<span>Open Visual Builder</span>
				</Button>
			</div>

			{/* Runs Table */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						Execution History ({runs.length})
					</CardTitle>
					<CardDescription>
						All customer automation workflows orchestrated durably by Cloudflare
						Workflows and executed by the regional data engine.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{runs.length === 0 ? (
						<div className="text-muted-foreground space-y-3 py-12 text-center text-sm">
							<p>No execution runs recorded yet for this automation.</p>
							<Button
								render={
									<Link
										to={`/${orgSlug}/marketing/automations/${journey.id}`}
									/>
								}
								size="sm"
								variant="outline"
							>
								Launch Test Run in Builder
							</Button>
						</div>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="w-[180px]">Run ID</TableHead>
										<TableHead>Customer UUID</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Started At</TableHead>
										<TableHead>Duration</TableHead>
										<TableHead className="text-right">Audit Trail</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{runs.map((run) => (
										<TableRow key={run.id} className="hover:bg-muted/30">
											<TableCell className="font-mono text-xs font-semibold">
												{run.id.slice(0, 8)}...{run.id.slice(-6)}
											</TableCell>
											<TableCell className="text-muted-foreground font-mono text-xs">
												{run.customerId}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={cn(
														'text-[10px] font-semibold capitalize',
														run.status === 'completed' &&
															'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
														run.status === 'running' &&
															'animate-pulse border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
														run.status === 'failed' &&
															'bg-destructive/10 text-destructive border-destructive/30',
														run.status === 'cancelled' &&
															'bg-muted text-muted-foreground',
													)}
												>
													{run.status}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{new Date(run.startedAt).toLocaleString()}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{formatDuration(run.startedAt, run.completedAt)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="text-primary hover:text-primary hover:bg-primary/10 h-7 text-xs font-medium"
													onClick={() => openTimeline(run)}
												>
													View Timeline &rarr;
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Timeline Dialog */}
			<Dialog
				open={Boolean(selectedRun)}
				onOpenChange={(open) => {
					if (!open) setSelectedRun(null)
				}}
			>
				<DialogContent className="sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<span>Run Execution Timeline</span>
							{selectedRun && (
								<Badge
									variant="outline"
									className={cn(
										'text-[10px] capitalize',
										selectedRun.status === 'completed' &&
											'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
										selectedRun.status === 'running' &&
											'border-blue-500/30 bg-blue-500/10 text-blue-600',
										selectedRun.status === 'failed' &&
											'bg-destructive/10 text-destructive border-destructive/30',
									)}
								>
									{selectedRun.status}
								</Badge>
							)}
						</DialogTitle>
						<DialogDescription className="font-mono text-xs">
							Run ID: {selectedRun?.id}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						{selectedRun?.errorMessage && (
							<div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs">
								<p className="font-semibold">Workflow Error:</p>
								<p>{selectedRun.errorMessage}</p>
							</div>
						)}

						{loadingTimeline ? (
							<p className="text-muted-foreground py-6 text-center text-sm">
								Loading step executions from regional SQLite outbox...
							</p>
						) : timeline.length === 0 ? (
							<div className="text-muted-foreground py-6 text-center text-sm">
								No discrete action step dispatches recorded for this run.
							</div>
						) : (
							<div className="space-y-3">
								<h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
									Step Executions ({timeline.length})
								</h4>
								<div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
									{timeline.map((step, idx) => (
										<div
											key={step.id || idx}
											className="bg-card flex items-start justify-between rounded-lg border p-3 shadow-2xs"
										>
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<span className="text-foreground font-mono text-xs font-semibold">
														{step.nodeId}
													</span>
													<Badge
														variant="outline"
														className="text-[9px] font-semibold tracking-wider uppercase"
													>
														{step.nodeType}
													</Badge>
												</div>
												<p className="text-muted-foreground font-mono text-[11px]">
													Attempt: {step.attempt} • Executed:{' '}
													{step.executedAt
														? new Date(step.executedAt).toLocaleTimeString()
														: 'Pending'}
												</p>
												{step.errorMessage && (
													<p className="text-destructive text-xs">
														{step.errorMessage}
													</p>
												)}
											</div>

											<Badge
												variant="outline"
												className={cn(
													'shrink-0 text-[10px] capitalize',
													step.status === 'completed' ||
														step.status === 'delivered'
														? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
														: step.status === 'failed'
															? 'bg-destructive/10 text-destructive border-destructive/30'
															: 'bg-muted text-muted-foreground',
												)}
											>
												{step.status}
											</Badge>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
