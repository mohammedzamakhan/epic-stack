import { type LoaderFunctionArgs } from 'react-router'

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * This endpoint provides OAuth server metadata for discovery.
 * MCP clients may query this to discover OAuth endpoints.
 *
 * Route: /.well-known/oauth-authorization-server
 */
export async function loader({ request }: LoaderFunctionArgs) {
	console.log('[OAuth Discovery] Request received')
	console.log('[OAuth Discovery] URL:', request.url)

	const url = new URL(request.url)
	const baseUrl = `${url.protocol}//${url.host}`

	return Response.json(
		{
			issuer: baseUrl,
			authorization_endpoint: `${baseUrl}/mcp/authorize`,
			token_endpoint: `${baseUrl}/mcp/token`,
			registration_endpoint: `${baseUrl}/mcp/register`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none'],
			code_challenge_methods_supported: ['S256'],
		},
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		},
	)
}
