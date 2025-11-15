import { invariant } from '@epic-web/invariant'
import { requireUserWithRole } from '@repo/auth'
import { ssoConfigurationService } from '#app/utils/sso-configuration.server.ts'
import { type Route } from './+types/organizations.$organizationId.sso.ts'

export async function action({ request, params }: Route.ActionArgs) {
	await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	if (request.method !== 'POST') {
		return Response.json({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		// Get SSO configuration
		const ssoConfig = await ssoConfigurationService.getConfiguration(
			params.organizationId,
		)

		if (!ssoConfig) {
			return Response.json(
				{
					success: false,
					message: 'SSO configuration not found for this organization',
				},
				{ status: 404 },
			)
		}

		// Test the connection
		const testResult = await ssoConfigurationService.testConnection(ssoConfig)

		return Response.json(testResult)
	} catch (error) {
		console.error('SSO connection test error:', error)
		return Response.json(
			{
				success: false,
				message: 'An error occurred while testing the SSO connection',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		)
	}
}

// GET method to check if SSO is configured
export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	try {
		const ssoConfig = await ssoConfigurationService.getConfiguration(
			params.organizationId,
		)

		return Response.json({
			configured: !!ssoConfig,
			enabled: ssoConfig?.isEnabled || false,
			lastTested: ssoConfig?.lastTested || null,
		})
	} catch (error) {
		console.error('SSO status check error:', error)
		return Response.json(
			{
				configured: false,
				enabled: false,
				lastTested: null,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		)
	}
}
