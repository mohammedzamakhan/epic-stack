import { i18n } from '@lingui/core'
import { msg, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { requireUserWithRole } from '@repo/auth'
import {
	getPlatformJourneyById,
	pausePlatformJourney,
	publishPlatformJourney,
	updatePlatformJourney,
} from '@repo/marketing/server/platform-journeys'
import {
	WorkflowCanvas,
	PLATFORM_WORKFLOW_CONFIG,
	type WorkflowGraph,
	type JourneyStatus,
} from '@repo/marketing-workflow'
import {
	redirect,
	useFetcher,
	useLoaderData,
	useNavigate,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from 'react-router'
import { toast } from 'sonner'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const journeyId = params.journeyId || ''
	const journey = await getPlatformJourneyById(journeyId)

	if (!journey) {
		throw new Response(i18n._(t`Automation not found`), { status: 404 })
	}

	const nodes = journey.nodes ? JSON.parse(journey.nodes) : []
	const edges = journey.edges ? JSON.parse(journey.edges) : []

	return {
		journey: {
			id: journey.id,
			name: journey.name,
			description: journey.description,
			status: journey.status as JourneyStatus,
			triggerType: journey.triggerType,
			graphJson: journey.graphJson || undefined,
			nodes,
			edges,
		},
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const journeyId = params.journeyId || ''
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'save' || intent === 'publish') {
		const name = formData.get('name')
		const graphJson = formData.get('graphJson')

		if (typeof graphJson !== 'string') {
			return { error: i18n._(t`Graph data missing`) }
		}

		let parsedGraph: WorkflowGraph
		try {
			parsedGraph = JSON.parse(graphJson) as WorkflowGraph
		} catch {
			return { error: i18n._(t`Invalid graph format`) }
		}

		const triggerNode = parsedGraph.nodes.find((n) => n.type === 'trigger')
		const triggerType = (triggerNode?.data as { triggerType?: string })
			?.triggerType
		const triggerConfig =
			(triggerNode?.data as { config?: Record<string, unknown> })?.config || {}

		await updatePlatformJourney(journeyId, {
			name: name ? String(name) : undefined,
			triggerType,
			triggerConfig,
			nodes: parsedGraph.nodes,
			edges: parsedGraph.edges,
			graphJson,
		})

		if (intent === 'publish') {
			try {
				await publishPlatformJourney(journeyId)
			} catch (error) {
				return {
					error:
						error instanceof Error
							? error.message
							: i18n._(t`Failed to publish automation`),
				}
			}
		}

		return { success: true }
	}

	if (intent === 'pause') {
		await pausePlatformJourney(journeyId)
		return redirect('/marketing/automations')
	}

	return null
}

export default function AdminEditAutomationRoute() {
	const { _ } = useLingui()
	const { journey } = useLoaderData<typeof loader>()
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const isSubmitting = fetcher.state !== 'idle'

	const initialGraph =
		journey.graphJson ||
		JSON.stringify({ nodes: journey.nodes, edges: journey.edges })

	const handleSave = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{ intent: 'save', name, graphJson: JSON.stringify(graph) },
			{ method: 'POST' },
		)
		toast.success(_(msg`Automation saved`))
	}

	const handlePublish = (graph: WorkflowGraph, name: string) => {
		void fetcher.submit(
			{ intent: 'publish', name, graphJson: JSON.stringify(graph) },
			{ method: 'POST' },
		)
		toast.success(_(msg`Publishing automation...`))
	}

	const handlePause = () => {
		void fetcher.submit({ intent: 'pause' }, { method: 'POST' })
	}

	return (
		<div className="bg-background fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden">
			<WorkflowCanvas
				workflowConfig={PLATFORM_WORKFLOW_CONFIG}
				initialGraph={initialGraph}
				journeyName={journey.name}
				journeyStatus={journey.status}
				onSave={handleSave}
				onPublish={handlePublish}
				onPause={journey.status === 'active' ? handlePause : undefined}
				onTestRun={() => {
					toast.info(_(msg`Platform test runs are not yet wired to execution.`))
				}}
				onBack={() => navigate('/marketing/automations')}
				isSaving={isSubmitting}
				isPublishing={isSubmitting}
			/>
		</div>
	)
}
