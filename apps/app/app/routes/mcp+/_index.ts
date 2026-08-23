import { logMCPRateLimitExceeded, logMCPToolInvoked } from '@repo/audit'
import { getDomainUrl } from '@repo/common'
import { getMcpServerName } from '@repo/config/brand'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import {
	validateAccessToken,
	validateApiKey,
} from '#app/utils/mcp/oauth.server.ts'
import {
	getToolDefinitions,
	handleMCPRequest,
	type MCPToolRequest,
} from '#app/utils/mcp/server.server.ts'
import {
	createMCPHeaders,
	createPreflightHeaders,
	encodeSseComment,
	encodeSseEvent,
	MCP_PROTOCOL_VERSION,
	negotiateResponseType,
	validateOrigin,
	validateProtocolVersion,
} from '#app/utils/mcp/streamable-http.server.ts'
import { checkRateLimit, RATE_LIMITS } from '#app/utils/rate-limit.server.ts'

/**
 * Build resource URL for OAuth discovery (RFC 9728)
 */
function getResourceUrl(request: Request): string {
	const domainUrl = getDomainUrl(request)
	return `${domainUrl}/mcp`
}

/**
 * MCP Server Endpoint - Stateless Transport (Protocol Version 2026-07-28)
 *
 * This endpoint implements the MCP Stateless transport specification:
 *
 * POST: Send JSON-RPC messages to the server (Stateless)
 * - Headers: `Mcp-Method` and `Mcp-Name` for routing.
 * - Every request is self-describing via `_meta` (capabilities, identity).
 * - No session initialization or management needed.
 * - server/discover for fetching capabilities.
 *
 * POST /subscriptions/listen: Replaces GET SSE stream.
 *
 * Security:
 * - Origin header validation (DNS rebinding protection)
 * - MCP-Protocol-Version header validation
 * - Bearer token authentication
 */

/**
 * Handle OPTIONS requests for CORS preflight
 */
async function handlePreflight(request: Request): Promise<Response> {
	const originResult = validateOrigin(request)
	if (originResult instanceof Response) {
		return originResult
	}

	return new Response(null, {
		status: 204,
		headers: createPreflightHeaders(originResult.origin),
	})
}

/**
 * Handle POST requests for JSON-RPC messages (Stateless transport)
 */
export async function action({ request }: ActionFunctionArgs) {
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return handlePreflight(request)
	}

	// Import to register tools (side-effect import)
	await import('#app/utils/mcp/tools.server.ts')

	// Validate Origin header (DNS rebinding protection)
	const originResult = validateOrigin(request)
	if (originResult instanceof Response) {
		return originResult
	}

	// Validate protocol version
	const protocolError = validateProtocolVersion(request)
	if (protocolError) {
		return protocolError
	}

	// Build resource URL for OAuth discovery (RFC 9728)
	const resourceUrl = getResourceUrl(request)

	// Extract access token from Authorization header
	const authHeader = request.headers.get('authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return new Response('Unauthorized', {
			status: 401,
			headers: {
				'Content-Type': 'text/plain',
				'WWW-Authenticate': `Bearer realm="MCP", resource="${resourceUrl}"`,
			},
		})
	}

	const accessToken = authHeader.slice(7) // Remove "Bearer " prefix

	// Validate access token or API key
	let tokenData = await validateAccessToken(accessToken)
	if (!tokenData) {
		tokenData = await validateApiKey(accessToken)
	}

	if (!tokenData) {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32600,
					message: 'Invalid or expired access token',
				},
			},
			{ status: 401 },
		)
	}

	// Parse JSON-RPC request
	let jsonRpcRequest: any
	try {
		jsonRpcRequest = await request.json()
	} catch {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32700,
					message: 'Parse error: Invalid JSON',
				},
			},
			{ status: 400 },
		)
	}

	try {
		const { method, params, id, _meta } = jsonRpcRequest

		// Header-based routing support
		const mcpMethod = request.headers.get('Mcp-Method') || method
		const mcpName = request.headers.get('Mcp-Name') || params?.name

		// Handle notifications (no id) - return 202 Accepted
		if (id === undefined || id === null) {
			const headers = createMCPHeaders({
				origin: originResult.origin,
			})
			return new Response(null, { status: 202, headers })
		}

		// Stateless server discovery replacing the initialize handshake
		if (mcpMethod === 'server/discover') {
			const result = {
				protocolVersion: MCP_PROTOCOL_VERSION,
				capabilities: {
					tools: {},
					// Additional capabilities can be added here
				},
				serverInfo: {
					name: getMcpServerName(),
					version: '2.0.0', // updated for 2026-07-28
				},
			}

			const responseType = negotiateResponseType(request)
			if (responseType === 'sse') {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					originResult.origin,
				)
			}

			const headers = createMCPHeaders({
				origin: originResult.origin,
			})

			return Response.json({ jsonrpc: '2.0', id, result }, { headers })
		}

		// Helper to create response headers
		const getResponseHeaders = () => {
			return createMCPHeaders({
				origin: originResult.origin,
			})
		}

		// List available tools
		if (mcpMethod === 'tools/list') {
			const tools = getToolDefinitions()
			const result = { tools, _meta: { cache: { ttlMs: 3600000 } } } // Adding cache hints per new spec

			const responseType = negotiateResponseType(request)
			if (responseType === 'sse') {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					originResult.origin,
				)
			}

			return Response.json(
				{ jsonrpc: '2.0', id, result },
				{ headers: getResponseHeaders() },
			)
		}

		// Call a tool
		if (mcpMethod === 'tools/call') {
			// Check rate limit for tool invocations (1000 per hour per token)
			const rateLimitCheck = await checkRateLimit(
				{ type: 'token', value: accessToken },
				RATE_LIMITS.toolInvocation,
			)

			if (!rateLimitCheck.allowed) {
				await logMCPRateLimitExceeded(
					tokenData.user.id,
					tokenData.organization.id,
					'tool_invocation',
					request,
				)
				return Response.json(
					{
						jsonrpc: '2.0',
						id,
						error: {
							code: -32603,
							message: 'Rate limit exceeded for tool invocations',
						},
					},
					{ status: 429 },
				)
			}

			const mcpRequest: MCPToolRequest = {
				method: 'tools/call',
				params: {
					name: mcpName || params.name,
					arguments: params.arguments,
				},
			}

			const result = await handleMCPRequest(mcpRequest, {
				user: tokenData.user,
				organization: tokenData.organization,
			})

			// Log tool invocation
			await logMCPToolInvoked(
				tokenData.user.id,
				tokenData.organization.id,
				mcpName || params.name,
				tokenData.authorizationId,
				request,
			)

			const responseType = negotiateResponseType(request)
			if (responseType === 'sse') {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					originResult.origin,
				)
			}

			return Response.json(
				{ jsonrpc: '2.0', id, result },
				{ headers: getResponseHeaders() },
			)
		}

		// Subscriptions listen replacing GET SSE stream
		if (mcpMethod === 'subscriptions/listen') {
			return createListenSseResponse(request, originResult.origin)
		}

		// Ping/pong for keepalive
		if (mcpMethod === 'ping') {
			const responseType = negotiateResponseType(request)
			if (responseType === 'sse') {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result: {} },
					originResult.origin,
				)
			}

			return Response.json(
				{ jsonrpc: '2.0', id, result: {} },
				{ headers: getResponseHeaders() },
			)
		}

		// Unknown method
		return Response.json(
			{
				jsonrpc: '2.0',
				id,
				error: {
					code: -32601,
					message: `Method not found: ${mcpMethod}`,
				},
			},
			{ status: 404 },
		)
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		return Response.json(
			{
				jsonrpc: '2.0',
				id: jsonRpcRequest?.id,
				error: {
					code: -32603,
					message: `Internal error: ${errorMessage}`,
				},
			},
			{ status: 500 },
		)
	}
}

/**
 * Create an SSE response for a single JSON-RPC message
 */
function createSseResponse(jsonRpcResponse: object, origin?: string): Response {
	const encoder = new TextEncoder()
	const eventId = crypto.randomUUID()

	const stream = new ReadableStream({
		start(controller) {
			// Send the response as an SSE event with ID for resumability
			controller.enqueue(
				encoder.encode(encodeSseEvent(jsonRpcResponse, eventId)),
			)
			// Close the stream after sending the response
			controller.close()
		},
	})

	const headers = createMCPHeaders({
		origin,
		contentType: 'text/event-stream',
	})
	headers.set('Cache-Control', 'no-cache')
	headers.set('Connection', 'keep-alive')

	return new Response(stream, { status: 200, headers })
}

/**
 * Handle POST subscriptions/listen to establish SSE connection
 * Replaces the old GET loader approach.
 */
function createListenSseResponse(request: Request, origin?: string): Response {
	const encoder = new TextEncoder()
	let isClosed = false
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null

	const stream = new ReadableStream({
		start(controller) {
			const initialEventId = crypto.randomUUID()
			controller.enqueue(encoder.encode(`id: ${initialEventId}\ndata: \n\n`))

			// Send retry directive (30 seconds)
			controller.enqueue(encoder.encode(`retry: 30000\n\n`))

			// Send periodic comment heartbeats to keep connection alive
			heartbeatInterval = setInterval(() => {
				if (!isClosed) {
					try {
						controller.enqueue(encoder.encode(encodeSseComment('ping')))
					} catch {
						isClosed = true
						if (heartbeatInterval) {
							clearInterval(heartbeatInterval)
						}
					}
				}
			}, 30000)
		},

		cancel() {
			isClosed = true
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval)
			}
		},
	})

	const headers = createMCPHeaders({
		origin,
		contentType: 'text/event-stream',
	})
	headers.set('Cache-Control', 'no-cache')
	headers.set('Connection', 'keep-alive')

	return new Response(stream, { status: 200, headers })
}

/**
 * Handle GET requests for legacy compatibility ONLY or return 405.
 * Since we migrated entirely to 2026-07-28 stateless, GET SSE is no longer supported.
 * We return 405 Method Not Allowed advising the new POST `subscriptions/listen` method.
 */
export async function loader({ request }: LoaderFunctionArgs) {
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return handlePreflight(request)
	}

	return new Response('Method Not Allowed. Use POST subscriptions/listen.', {
		status: 405,
		headers: {
			Allow: 'POST, OPTIONS',
			'Content-Type': 'text/plain',
		},
	})
}
