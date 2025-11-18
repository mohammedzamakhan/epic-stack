import { invariant } from '@epic-web/invariant'
import type { PrismaClient } from '@prisma/client'
import { integrationManager, OAuthStateManager } from '../index'
import { type LoaderFunctionArgs } from 'react-router'

export interface OAuthCallbackDependencies {
	requireUserId: (request: Request) => Promise<string>
	redirectWithToast: (
		url: string,
		options: { title: string; description: string; type: string },
	) => Response | Promise<Response>
	prisma: PrismaClient
}

/**
 * Shared OAuth callback handler for integration providers.
 * Handles both OAuth 1.0a (Trello) and OAuth 2.0 flows.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, toast, prisma)
 * @returns Redirect response with toast message
 */
export async function handleOAuthCallback(
	{ request }: LoaderFunctionArgs,
	deps: OAuthCallbackDependencies,
) {
	await deps.requireUserId(request)

	const url = new URL(request.url)
	// OAuth 2.0 parameters
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')
	const error = url.searchParams.get('error')
	const errorDescription = url.searchParams.get('error_description')

	// OAuth 1.0a parameters (for Trello)
	const oauthToken = url.searchParams.get('oauth_token')
	const oauthVerifier = url.searchParams.get('oauth_verifier')

	let providerName = url.searchParams.get('provider')

	// Handle OAuth errors
	if (error) {
		const errorMsg = errorDescription || error
		console.error('OAuth error:', errorMsg)

		return deps.redirectWithToast('/', {
			title: 'Integration failed',
			description: `Failed to connect: ${errorMsg}`,
			type: 'error',
		})
	}

	if (code && state && !providerName) {
		providerName = 'notion'
	}

	// Determine if this is OAuth 1.0a (Trello) or OAuth 2.0 flow
	const isOAuth1 = oauthToken && oauthVerifier
	const isOAuth2 = code && state

	// Validate required parameters based on OAuth flow
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
		// Handle OAuth callback based on flow type
		let integration
		let stateData

		if (isOAuth1) {
			// OAuth 1.0a flow (Trello) - retrieve organization context from stored request token
			// The organization ID was stored when the request token was created
			const provider = integrationManager.getProvider('trello')
			if (!provider || !('getRequestTokenContext' in provider)) {
				throw new Error(
					'Trello provider not found or does not support OAuth 1.0a',
				)
			}

			// Get the stored context using the oauth_token (request token)
			const tokenContext = await (provider as any).getRequestTokenContext(
				oauthToken!,
			)

			if (!tokenContext) {
				throw new Error(
					'OAuth request token not found or expired. Please restart the authorization process.',
				)
			}

			// Create state data from the stored context
			stateData = {
				organizationId: tokenContext.organizationId,
				providerName: 'trello',
				timestamp: tokenContext.timestamp,
			}

			integration = await integrationManager.handleOAuthCallback(providerName, {
				organizationId: stateData.organizationId,
				code: oauthVerifier!, // Use oauth_verifier as code for OAuth 1.0a
				state: `trello-oauth1-${Date.now()}`, // Generate a simple state for OAuth 1.0a
				error: error || undefined,
				errorDescription: errorDescription || undefined,
				// Pass oauth_token for OAuth 1.0a flows
				oauthToken: oauthToken!,
			})
		} else {
			// OAuth 2.0 flow (all other providers) - validate state first
			try {
				stateData = OAuthStateManager.validateState(state!)
			} catch (error) {
				throw new Error(`Invalid OAuth state: ${error}`)
			}

			integration = await integrationManager.handleOAuthCallback(providerName, {
				organizationId: stateData.organizationId,
				code: code!,
				state: state!,
				error: error || undefined,
				errorDescription: errorDescription || undefined,
			})
		}

		// Get organization slug for redirect
		const organization = await deps.prisma.organization.findUnique({
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
