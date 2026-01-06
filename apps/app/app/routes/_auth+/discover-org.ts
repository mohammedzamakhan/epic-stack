import { type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { discoverOrganizationFromEmail } from '#app/utils/organization/organizations.server.ts'
import { ssoConfigurationService } from '#app/utils/sso/configuration.server.ts'

const DiscoverOrgSchema = z.object({
	email: z.string().email('Invalid email format'),
})

/**
 * API endpoint to discover organization from email domain
 * Used by the login form to determine if SSO is available
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const email = url.searchParams.get('email')

	// Validate email parameter
	const result = DiscoverOrgSchema.safeParse({ email })
	if (!result.success) {
		return Response.json(
			{
				error: 'Invalid email format',
				organization: null,
				ssoConfig: null,
				ssoAvailable: false,
			},
			{ status: 400 },
		)
	}

	try {
		// Discover organization from email domain
		const organization = await discoverOrganizationFromEmail(result.data.email)

		if (!organization) {
			return Response.json({
				error: null,
				organization: null,
				ssoConfig: null,
				ssoAvailable: false,
			})
		}

		// Check if organization has SSO configured
		const ssoConfig = await ssoConfigurationService.getConfiguration(
			organization.id,
		)

		if (!ssoConfig || !ssoConfig.isEnabled) {
			return Response.json({
				error: null,
				organization,
				ssoConfig: null,
				ssoAvailable: false,
			})
		}

		// Return organization and SSO configuration (without sensitive data)
		const safeSSOConfig = {
			id: ssoConfig.id,
			providerName: ssoConfig.providerName,
			issuerUrl: ssoConfig.issuerUrl,
			clientId: ssoConfig.clientId,
			scopes: ssoConfig.scopes,
			autoDiscovery: ssoConfig.autoDiscovery,
			pkceEnabled: ssoConfig.pkceEnabled,
			isEnabled: ssoConfig.isEnabled,
		}

		return Response.json({
			error: null,
			organization,
			ssoConfig: safeSSOConfig,
			ssoAvailable: true,
		})
	} catch (error) {
		console.error('Error discovering organization:', error)

		return Response.json(
			{
				error: 'Failed to discover organization',
				organization: null,
				ssoConfig: null,
				ssoAvailable: false,
			},
			{ status: 500 },
		)
	}
}
