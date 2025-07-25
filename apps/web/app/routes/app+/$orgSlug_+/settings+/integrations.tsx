import { invariant } from '@epic-web/invariant'
import { integrationManager, getAvailableProviders } from '@repo/integrations'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
} from 'react-router'

import {
	IntegrationsCard,
	connectIntegrationActionIntent,
	disconnectIntegrationActionIntent,
} from '#app/components/settings/cards/organization/integrations-card'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { redirectWithToast } from '#app/utils/toast.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const [integrations, availableProviders] = await Promise.all([
		integrationManager.getOrganizationIntegrations(organization.id),
		getAvailableProviders(),
	])

	return {
		organization,
		integrations,
		availableProviders,
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: { id: true, name: true, slug: true },
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === connectIntegrationActionIntent) {
		const providerName = formData.get('providerName') as string

		if (!providerName) {
			return Response.json(
				{ error: 'Provider name is required' },
				{ status: 400 },
			)
		}

		try {
			const url = new URL(request.url)
			const protocol = url.protocol === 'https:' ? 'https:' : 'https:'
			const redirectUri = `${protocol}//${url.host}/api/integrations/oauth/callback?provider=${providerName}`

			const { authUrl } = await integrationManager.initiateOAuth(
				organization.id,
				providerName,
				redirectUri,
			)

			return Response.redirect(authUrl)
		} catch (error) {
			return redirectWithToast(
				`/app/${organization.slug}/settings/integrations`,
				{
					title: 'Integration failed',
					description: `Failed to initiate OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`,
					type: 'error',
				},
			)
		}
	}

	if (intent === disconnectIntegrationActionIntent) {
		const integrationId = formData.get('integrationId') as string

		if (!integrationId) {
			return Response.json(
				{ error: 'Integration ID is required' },
				{ status: 400 },
			)
		}

		try {
			await integrationManager.disconnectIntegration(integrationId)
			return Response.json({ success: true })
		} catch {
			return Response.json(
				{
					error: 'Failed to disconnect integration',
				},
				{ status: 500 },
			)
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function IntegrationsSettings() {
	const { integrations, availableProviders } = useLoaderData<typeof loader>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection
				title="Integrations"
				description="Connect your organization to third-party services like Slack, Teams, and more."
			>
				<IntegrationsCard
					integrations={integrations}
					availableProviders={availableProviders}
				/>
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
