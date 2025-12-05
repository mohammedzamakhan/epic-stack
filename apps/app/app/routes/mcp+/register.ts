import { type ActionFunctionArgs } from 'react-router'

/**
 * OAuth Dynamic Client Registration Endpoint (RFC 7591)
 *
 * This endpoint handles dynamic client registration for MCP clients.
 * Since we don't require client authentication (public clients), we simply
 * return a success response with the client metadata.
 *
 * NOTE: This endpoint is PUBLIC (no authentication required) as it's part of OAuth discovery.
 */
export async function action({ request }: ActionFunctionArgs) {
	console.log('[MCP Register] POST request received')
	console.log('[MCP Register] URL:', request.url)
	console.log(
		'[MCP Register] Headers:',
		Object.fromEntries(request.headers.entries()),
	)

	try {
		const body = (await request.json()) as Record<string, any>
		console.log('[MCP Register] Request body:', JSON.stringify(body, null, 2))

		const url = new URL(request.url)
		const baseUrl = `${url.protocol}//${url.host}`

		// For MCP OAuth, we use public clients (no client secret required)
		// Return the registration response with the OAuth endpoints
		return Response.json(
			{
				client_id: 'mcp-public-client',
				client_name: body.client_name || 'MCP Client',
				redirect_uris: body.redirect_uris || [],
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
	console.log('[MCP Register] GET request received')

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
