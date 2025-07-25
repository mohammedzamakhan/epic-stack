import { integrationManager } from '@repo/integrations'
import { prisma } from '@repo/prisma'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'

/**
 * API endpoint to update integration configuration
 * Used by the Jira bot user settings UI
 */
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const defaultOrg = await getUserDefaultOrganization(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	// Check for the correct intent
	if (intent !== 'update-integration-config') {
		return Response.json({ error: 'Invalid intent' }, { status: 400 })
	}

	const integrationId = formData.get('integrationId')
	if (!integrationId || typeof integrationId !== 'string') {
		return Response.json(
			{ error: 'Integration ID is required' },
			{ status: 400 },
		)
	}

	const configString = formData.get('config')
	if (!configString || typeof configString !== 'string') {
		return Response.json({ error: 'Config is required' }, { status: 400 })
	}

	let config
	try {
		config = JSON.parse(configString)
	} catch (error) {
		return Response.json({ error: 'Invalid config JSON' }, { status: 400 })
	}

	try {
		// Verify the integration belongs to this organization
		const integration = await prisma.integration.findUnique({
			where: {
				id: integrationId,
				organizationId: defaultOrg?.organization.id,
			},
		})

		if (!integration) {
			return Response.json({ error: 'Integration not found' }, { status: 404 })
		}

		// Special handling for Jira bot user configuration
		if (integration.providerName === 'jira' && 'useBotUser' in config) {
			// Validate bot user if enabled
			if (config.useBotUser && config.botUser?.accountId) {
				// Get Jira provider
				const jiraProvider = integrationManager.getProvider('jira')

				try {
					// Fetch bot user to validate it exists
					await jiraProvider.configureBotUser(
						integration,
						config.botUser.accountId,
					)
				} catch (error) {
					console.error('Error validating bot user:', error)
					return Response.json(
						{
							error: `Invalid bot user: ${error instanceof Error ? error.message : 'Unknown error'}`,
						},
						{ status: 400 },
					)
				}
			}
		}

		// Update the integration config
		const updatedIntegration = await prisma.integration.update({
			where: {
				id: integrationId,
			},
			data: {
				config: JSON.stringify(config),
			},
		})

		return Response.json({ success: true, integration: updatedIntegration })
	} catch (error) {
		console.error('Error updating integration config:', error)
		return Response.json(
			{
				error: `Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			{ status: 500 },
		)
	}
}
