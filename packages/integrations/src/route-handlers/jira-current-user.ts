import type { PrismaClient } from '@prisma/client'
import { integrationManager, JiraProvider } from '../index'
import { type LoaderFunctionArgs } from 'react-router'

export interface JiraCurrentUserDependencies {
	requireUserId: (request: Request) => Promise<string>
	getUserDefaultOrganization: (
		userId: string,
	) => Promise<{ organization: { id: string } } | null>
	prisma: PrismaClient
}

/**
 * Shared handler for getting the current Jira user.
 * Used by the bot user configuration UI.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param params - Route params containing integrationId
 * @param deps - Dependencies (auth, org utils, prisma)
 * @returns JSON response with current user info
 */
export async function handleJiraCurrentUser(
	{ request, params }: LoaderFunctionArgs,
	deps: JiraCurrentUserDependencies,
) {
	const userId = await deps.requireUserId(request)
	const defaultOrg = await deps.getUserDefaultOrganization(userId)
	const integrationId = params.integrationId
	if (!integrationId) {
		return Response.json(
			{ error: 'Integration ID is required' },
			{ status: 400 },
		)
	}

	try {
		// Verify the integration belongs to this organization
		const integration = await deps.prisma.integration.findUnique({
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

		// Get current user details
		const userDetails = await jiraProvider.getCurrentUserDetails(integration)

		return Response.json(userDetails)
	} catch (error) {
		console.error('Error getting current Jira user:', error)
		return Response.json(
			{
				error: `Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 },
		)
	}
}
