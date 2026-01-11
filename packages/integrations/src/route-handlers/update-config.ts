import type { PrismaClient } from '@prisma/client'
import { integrationManager, JiraProvider } from '../index'
import { type ActionFunctionArgs } from 'react-router'

export interface UpdateConfigDependencies {
	requireUserId: (request: Request) => Promise<string>
	getUserDefaultOrganization: (
		userId: string,
	) => Promise<{ organization: { id: string } } | null>
	prisma: PrismaClient
}

/**
 * Shared handler for updating integration configuration.
 * Used by the Jira bot user settings UI.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, org utils, prisma)
 * @returns JSON response with updated integration
 */
export async function handleUpdateIntegrationConfig(
	{ request }: ActionFunctionArgs,
	deps: UpdateConfigDependencies,
) {
	const userId = await deps.requireUserId(request)
	const defaultOrg = await deps.getUserDefaultOrganization(userId)

	if (!defaultOrg) {
		return Response.json(
			{ error: 'No organization found for user' },
			{ status: 403 },
		)
	}

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

	let config: any
	try {
		config = JSON.parse(configString)
	} catch {
		return Response.json({ error: 'Invalid config JSON' }, { status: 400 })
	}

	try {
		// Verify the integration belongs to this organization
		const integration = await deps.prisma.integration.findUnique({
			where: {
				id: integrationId,
				organizationId: defaultOrg.organization.id,
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
				const jiraProvider = integrationManager.getProvider(
					'jira',
				) as JiraProvider

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
		const updatedIntegration = await deps.prisma.integration.update({
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
