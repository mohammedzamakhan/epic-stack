import {
	WorkflowCanvas,
	createDefaultJourneyGraph,
	type WorkflowGraph,
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
	await getOperatorTenantClient(request, orgSlug)
	return { orgSlug }
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)
	const formData = await request.formData()
	const name = formData.get('name') || 'New Customer Journey'
	const graphJson = formData.get('graphJson')
	const shouldPublish = formData.get('publish') === 'true'

	if (typeof graphJson !== 'string' || !graphJson) {
		return { error: 'Graph data is required' }
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

	// Create journey in tenant-api
	const createRes = await fetchTenant('/operator/journeys', {
		method: 'POST',
		body: JSON.stringify({
			name: String(name),
			description: 'Automated lifecycle journey created via visual builder.',
			triggerType,
			triggerConfig,
			nodes: parsedGraph.nodes,
			edges: parsedGraph.edges,
			graphJson,
		}),
	})

	if (!createRes.ok) {
		const err = await createRes.json().catch(() => ({}))
		return { error: (err as any).error || 'Failed to create journey' }
	}

	const created = (await createRes.json()) as any
	const journeyId = created.journey?.id

	if (shouldPublish && journeyId) {
		await fetchTenant(`/operator/journeys/${journeyId}/publish`, {
			method: 'POST',
		})
	}

	return redirect(`/${orgSlug}/marketing/automations/${journeyId}`)
}

export default function NewJourneyRoute() {
	const { orgSlug } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const fetcher = useFetcher()

	const isSubmitting = fetcher.state !== 'idle'
	const initialGraph = createDefaultJourneyGraph()

	const handleSave = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{
				name,
				graphJson: JSON.stringify(graph),
				publish: 'false',
			},
			{ method: 'POST' },
		)
		toast.success('Saving new journey draft...')
	}

	const handlePublish = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{
				name,
				graphJson: JSON.stringify(graph),
				publish: 'true',
			},
			{ method: 'POST' },
		)
		toast.success('Publishing new journey...')
	}

	return (
		<div className="bg-background fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden">
			<WorkflowCanvas
				initialGraph={initialGraph}
				journeyName="New Customer Journey"
				journeyStatus="draft"
				onSave={handleSave}
				onPublish={handlePublish}
				onTestRun={() => {
					toast.info('Save the journey first before running test triggers.')
				}}
				onBack={() => navigate(`/${orgSlug}/marketing/automations`)}
				isSaving={isSubmitting}
				isPublishing={isSubmitting}
			/>
		</div>
	)
}
