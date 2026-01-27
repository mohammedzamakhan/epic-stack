import { prisma } from '@repo/database'
import { type ActionFunctionArgs } from 'react-router'
import { generateToken } from '#app/utils/mcp/oauth.server.ts'

/**
 * OAuth Dynamic Client Registration Endpoint (RFC 7591)
 *
 * This endpoint handles dynamic client registration for MCP clients.
 * Each client receives a unique client_id and their redirect URIs are
 * stored for validation during the authorization flow.
 *
 * NOTE: This endpoint is PUBLIC (no authentication required) as it's part of OAuth discovery.
 */
export async function action({ request }: ActionFunctionArgs) {
	try {
		const body = (await request.json()) as Record<string, any>

		const url = new URL(request.url)
		const baseUrl = `${url.protocol}//${url.host}`

		// Validate redirect_uris
		const redirectUris = Array.isArray(body.redirect_uris)
			? body.redirect_uris.filter(
					(uri: unknown) => typeof uri === 'string' && uri.length > 0,
				)
			: []

		// Generate unique client ID
		const clientId = generateToken()
		const clientName = body.client_name || 'MCP Client'

		// Store client registration in database
		await prisma.mCPClient.create({
			data: {
				clientId,
				clientName,
				redirectUris: JSON.stringify(redirectUris),
			},
		})

		// Return the registration response with the OAuth endpoints
		return Response.json(
			{
				client_id: clientId,
				client_name: clientName,
				redirect_uris: redirectUris,
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				token_endpoint_auth_method: 'none',
				// Include the OAuth endpoints in the response
				authorization_endpoint: `${baseUrl}/mcp/authorize`,
				token_endpoint: `${baseUrl}/mcp/token`,
			},
			{
				status: 201,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store',
				},
			},
		)
	} catch (error) {
		console.error('[MCP Register] Error:', error)
		return Response.json(
			{
				error: 'invalid_request',
				error_description: 'Invalid registration request',
			},
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json',
				},
			},
		)
	}
}

/**
 * Handle GET requests - not supported for registration
 */
export async function loader() {
	return Response.json(
		{
			error: 'invalid_request',
			error_description: 'GET method not supported for client registration',
		},
		{
			status: 405,
			headers: {
				'Content-Type': 'application/json',
			},
		},
	)
}
