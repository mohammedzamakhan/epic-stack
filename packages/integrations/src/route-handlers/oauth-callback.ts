import { invariant } from '@epic-web/invariant'
import { prisma } from '@repo/database'
import { oauthFlow } from '../oauth-flow'
import { type LoaderFunctionArgs } from 'react-router'

export interface OAuthCallbackDependencies {
	requireUserId: (request: Request) => Promise<string>
	redirectWithToast: (
		url: string,
		options: { title: string; description: string; type: string },
	) => Response | Promise<Response>
}

/**
 * Shared OAuth callback handler for integration providers.
 * Handles both OAuth 1.0a (Trello) and OAuth 2.0 flows.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, toast)
 * @returns Redirect response with toast message
 */
export async function handleOAuthCallback(
	{ request }: LoaderFunctionArgs,
	deps: OAuthCallbackDependencies,
) {
	await deps.requireUserId(request)

	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')
	const error = url.searchParams.get('error')
	const errorDescription = url.searchParams.get('error_description')
	const oauthToken = url.searchParams.get('oauth_token')
	const oauthVerifier = url.searchParams.get('oauth_verifier')
	const providerName = url.searchParams.get('provider')

	if (error) {
		const errorMsg = errorDescription || error
		console.error('OAuth error:', errorMsg)
		return deps.redirectWithToast('/', {
			title: 'Integration failed',
			description: `Failed to connect: ${errorMsg}`,
			type: 'error',
		})
	}

	const isOAuth1 = oauthToken && oauthVerifier
	const isOAuth2 = code && state

	if (!isOAuth1 && !isOAuth2) {
		return deps.redirectWithToast('/', {
			title: 'Integration failed',
			description: 'Missing required OAuth parameters',
			type: 'error',
		})
	}

	if (!providerName) {
		return deps.redirectWithToast('/', {
			title: 'Integration failed',
			description: 'Missing provider parameter',
			type: 'error',
		})
	}

	try {
		const integration = await oauthFlow.complete(providerName, {
			organizationId: '', // Complete will get it from state/token context
			code: code || '',
			state: state || '',
			error: error || undefined,
			errorDescription: errorDescription || undefined,
			oauthToken: oauthToken || undefined,
			oauthVerifier: oauthVerifier || undefined,
		})

		const organization = await prisma.organization.findUnique({
			where: { id: integration.organizationId },
			select: { slug: true },
		})

		invariant(organization, 'Organization not found')

		return deps.redirectWithToast(`/${organization.slug}/settings`, {
			title: 'Integration connected',
			description: `Successfully connected to ${providerName}`,
			type: 'success',
		})
	} catch (error) {
		console.error('OAuth callback error:', error)
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error occurred'

		return deps.redirectWithToast('/', {
			title: 'Integration failed',
			description: `Failed to complete connection: ${errorMessage}`,
			type: 'error',
		})
	}
}
