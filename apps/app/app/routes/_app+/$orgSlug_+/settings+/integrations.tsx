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
} from '#app/components/settings/cards/organization/integrations-card.tsx'

import { requireUserOrganization } from '#app/utils/organization-loader.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		name: true,
		slug: true,
	})

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
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		name: true,
		slug: true,
	})

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
			return redirectWithToast(`/${organization.slug}/settings/integrations`, {
				title: 'Integration failed',
				description: `Failed to initiate OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`,
				type: 'error',
			})
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
		<IntegrationsCard
			integrations={integrations}
			availableProviders={availableProviders}
		/>
	)
}
