import type { PrismaClient } from '@prisma/client'
import { integrationManager, JiraProvider } from '../index'
import { type LoaderFunctionArgs } from 'react-router'

export interface JiraSearchUsersDependencies {
	requireUserId: (request: Request) => Promise<string>
	getUserDefaultOrganization: (
		userId: string,
	) => Promise<{ organization: { id: string } } | null>
	prisma: PrismaClient
}

/**
 * Shared handler for searching Jira users.
 * Used by the bot user configuration UI.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param params - Route params containing integrationId
 * @param deps - Dependencies (auth, org utils, prisma)
 * @returns JSON response with search results
 */
export async function handleJiraSearchUsers(
	{ request, params }: LoaderFunctionArgs,
	deps: JiraSearchUsersDependencies,
) {
	const userId = await deps.requireUserId(request)
	const defaultOrg = await deps.getUserDefaultOrganization(userId)

	if (!defaultOrg) {
		return Response.json(
			{ error: 'No organization found for user' },
			{ status: 403 },
		)
	}

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
		const integration = await deps.prisma.integration.findUnique({
			where: {
				id: integrationId,
				organizationId: defaultOrg.organization.id,
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
