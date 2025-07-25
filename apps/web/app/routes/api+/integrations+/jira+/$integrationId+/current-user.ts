import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'
import { integrationManager } from '@repo/integrations'
import { prisma } from '@repo/prisma'
import { type LoaderFunctionArgs } from 'react-router'

/**
 * API endpoint to get current Jira user details
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
		const jiraProvider = integrationManager.getProvider('jira')

		// Get current user details
		const userDetails = await jiraProvider.getCurrentUserDetails(integration)

		return Response.json(userDetails)
	} catch (error) {
		console.error('Error fetching Jira user details:', error)
		return Response.json(
			{
				error: `Failed to fetch user details: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 },
		)
	}
}
