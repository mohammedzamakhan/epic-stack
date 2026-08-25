import {
	WorkflowCanvas,
	type WorkflowGraph,
	type JourneyStatus,
} from '@repo/marketing-workflow'
import {
	useLoaderData,
	useNavigate,
	useFetcher,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
} from 'react-router'
import { toast } from 'sonner'
import { getOperatorTenantClient } from '#app/utils/tenant-api.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const journeyId = params.journeyId || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)

	const res = await fetchTenant(`/operator/journeys/${journeyId}`)
	if (!res.ok) {
		throw new Response('Automation not found', { status: 404 })
	}

	const data = (await res.json()) as any
	const journey = data.journey

	const nodes = Array.isArray(journey.nodes) ? journey.nodes : []
	const edges = Array.isArray(journey.edges) ? journey.edges : []

	return {
		orgSlug,
		journey: {
			id: String(journey.id),
			name: String(journey.name),
			description: journey.description ? String(journey.description) : null,
			status: (journey.status || 'draft') as JourneyStatus,
			triggerType: String(journey.triggerType || 'customer_signup'),
			graphJson: journey.graphJson ? String(journey.graphJson) : undefined,
			nodes,
			edges,
		},
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const journeyId = params.journeyId || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'save') {
		const name = formData.get('name')
		const graphJson = formData.get('graphJson')

		if (typeof graphJson !== 'string') {
			return { error: 'Graph data missing' }
		}

		let parsedGraph: WorkflowGraph
		try {
			parsedGraph = JSON.parse(graphJson) as WorkflowGraph
		} catch {
			return { error: 'Invalid graph format' }
		}

		const triggerNode = parsedGraph.nodes.find((n: any) => n.type === 'trigger')
		const triggerType =
			(triggerNode?.data as any)?.triggerType || 'customer_signup'
		const triggerConfig =
			((triggerNode?.data as any)?.config as Record<string, unknown>) || {}

		const updateRes = await fetchTenant(`/operator/journeys/${journeyId}`, {
			method: 'PUT',
			body: JSON.stringify({
				name: name ? String(name) : undefined,
				triggerType,
				triggerConfig,
				nodes: parsedGraph.nodes,
				edges: parsedGraph.edges,
				graphJson,
			}),
		})

		if (!updateRes.ok) {
			const err = await updateRes.json().catch(() => ({}))
			return { error: (err as any).error || 'Failed to save automation' }
		}

		return { success: true, message: 'Automation saved successfully' }
	}

	if (intent === 'publish') {
		const graphJson = formData.get('graphJson')
		const name = formData.get('name')

		// First save latest graph
		if (typeof graphJson === 'string') {
			try {
				const parsedGraph = JSON.parse(graphJson) as WorkflowGraph
				const triggerNode = parsedGraph.nodes.find(
					(n: any) => n.type === 'trigger',
				)
				await fetchTenant(`/operator/journeys/${journeyId}`, {
					method: 'PUT',
					body: JSON.stringify({
						name: name ? String(name) : undefined,
						triggerType: (triggerNode?.data as any)?.triggerType,
						triggerConfig: (triggerNode?.data as any)?.config,
						nodes: parsedGraph.nodes,
						edges: parsedGraph.edges,
						graphJson,
					}),
				})
			} catch {}
		}

		const publishRes = await fetchTenant(
			`/operator/journeys/${journeyId}/publish`,
			{ method: 'POST' },
		)

		if (!publishRes.ok) {
			const err = await publishRes.json().catch(() => ({}))
			return { error: (err as any).error || 'Failed to publish automation' }
		}

		return { success: true, message: 'Automation published and activated!' }
	}

	if (intent === 'pause') {
		const pauseRes = await fetchTenant(
			`/operator/journeys/${journeyId}/pause`,
			{
				method: 'POST',
			},
		)

		if (!pauseRes.ok) {
			const err = await pauseRes.json().catch(() => ({}))
			return { error: (err as any).error || 'Failed to pause automation' }
		}

		return { success: true, message: 'Automation paused' }
	}

	if (intent === 'delete') {
		const deleteRes = await fetchTenant(`/operator/journeys/${journeyId}`, {
			method: 'DELETE',
		})

		if (!deleteRes.ok) {
			const err = await deleteRes.json().catch(() => ({}))
			return { error: (err as any).error || 'Failed to delete automation' }
		}

		return redirect(`/${orgSlug}/marketing/automations`)
	}

	if (intent === 'test_run') {
		const customerId = formData.get('customerId')
		if (typeof customerId !== 'string' || !customerId) {
			return { error: 'customerId is required' }
		}

		const testRes = await fetchTenant('/operator/journeys/trigger-test', {
			method: 'POST',
			body: JSON.stringify({
				journeyId,
				customerId,
			}),
		})

		if (!testRes.ok) {
			const err = await testRes.json().catch(() => ({}))
			return {
				error: (err as any).error || 'Failed to trigger test automation',
			}
		}

		const data = (await testRes.json()) as any
		return {
			success: true,
			message: `Test run triggered successfully (Run ID: ${data.runId || 'initiated'})`,
			runId: data.runId,
		}
	}

	return { error: 'Unknown intent' }
}

export default function JourneyBuilderRoute() {
	const { orgSlug, journey } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const fetcher = useFetcher()

	const isSubmitting = fetcher.state !== 'idle'

	// Initial graph from DB or raw json
	const initialGraph = journey.graphJson
		? journey.graphJson
		: {
				nodes: journey.nodes,
				edges: journey.edges,
			}

	const handleSave = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{
				intent: 'save',
				name,
				graphJson: JSON.stringify(graph),
			},
			{ method: 'POST' },
		)
		toast.success('Saving automation draft...')
	}

	const handlePublish = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{
				intent: 'publish',
				name,
				graphJson: JSON.stringify(graph),
			},
			{ method: 'POST' },
		)
		toast.success('Publishing and activating automation...')
	}

	const handlePause = () => {
		void fetcher.submit(
			{
				intent: 'pause',
			},
			{ method: 'POST' },
		)
		toast.info('Pausing automation...')
	}

	const handleTestRun = (customerId: string) => {
		void fetcher.submit(
			{
				intent: 'test_run',
				customerId,
			},
			{ method: 'POST' },
		)
		toast.info(`Triggering test run for customer "${customerId}"...`)
	}

	return (
		<div className="bg-background fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden">
			<WorkflowCanvas
				initialGraph={initialGraph}
				journeyName={journey.name}
				journeyStatus={journey.status}
				onSave={handleSave}
				onPublish={handlePublish}
				onPause={handlePause}
				onTestRun={handleTestRun}
				onBack={() => navigate(`/${orgSlug}/marketing/automations`)}
				onViewRuns={() =>
					navigate(`/${orgSlug}/marketing/automations/${journey.id}/runs`)
				}
				isSaving={isSubmitting}
				isPublishing={isSubmitting}
			/>
		</div>
	)
}
