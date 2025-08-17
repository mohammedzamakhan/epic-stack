import { integrationManager, JiraProvider } from '@repo/integrations'
import { prisma } from '@repo/prisma'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'

/**
 * API endpoint to search for Jira users
 * Used by the bot user configuration UI
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const defaultOrg = await getUserDefaultOrganization(userId)
	const integrationId = params.integrationId
	if (!integrationId) {
		return Response.json(
			{ error: 'Integration ID is required' },
			{ status: 400 },
		)
	}

	// Get search query from URL params
	const url = new URL(request.url)
	const query = url.searchParams.get('query')

	if (!query) {
		return Response.json({ error: 'Search query is required' }, { status: 400 })
	}

	try {
		// Verify the integration belongs to this organization
		const integration = await prisma.integration.findUnique({
			where: {
				id: integrationId,
				organizationId: defaultOrg?.organization.id,
			},
		})

		if (!integration || integration.providerName !== 'jira') {
			return Response.json(
				{ error: 'Jira integration not found' },
				{ status: 404 },
			)
		}

		// Get Jira provider
		const jiraProvider = integrationManager.getProvider('jira') as JiraProvider

		// Search for users
		const users = await jiraProvider.searchUsers(integration, query)

		return Response.json(users)
	} catch (error) {
		console.error('Error searching Jira users:', error)
		return Response.json(
			{
				error: `Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 },
		)
	}
}
