import { logMCPRateLimitExceeded, logMCPToolInvoked } from '@repo/audit'
import { getDomainUrl } from '@repo/common'
import { getClientIp } from '@repo/security'
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
	createSession,
	deleteSession,
	encodeSseComment,
	encodeSseEvent,
	getSession,
	getSessionId,
	MCP_PROTOCOL_VERSION,
	negotiateResponseType,
	validateOrigin,
	validateProtocolVersion,
} from '#app/utils/mcp/streamable-http.server.ts'
import {
	checkRateLimit,
	createRateLimitResponse,
	RATE_LIMITS,
} from '#app/utils/rate-limit.server.ts'

/**
 * Build resource URL for OAuth discovery (RFC 9728)
 */
function getResourceUrl(request: Request): string {
	const domainUrl = getDomainUrl(request)
	return `${domainUrl}/mcp`
}

/**
 * MCP Server Endpoint - Streamable HTTP Transport (Protocol Version 2025-11-25)
 *
 * This endpoint implements the MCP Streamable HTTP transport specification:
 *
 * POST: Send JSON-RPC messages to the server
 * - Requests return either application/json or text/event-stream based on Accept header
 * - Notifications/responses return 202 Accepted
 *
 * GET: Open SSE stream for server-to-client messages
 * - Used for server-initiated notifications
 * - Requires valid session (MCP-Session-Id)
 *
 * DELETE: Terminate a session
 * - Client explicitly ends the session
 *
 * Security:
 * - Origin header validation (DNS rebinding protection)
 * - MCP-Protocol-Version header validation
 * - Session management with MCP-Session-Id
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
 * Handle DELETE requests to terminate sessions
 */
async function handleDelete(request: Request): Promise<Response> {
	// Validate Origin header (DNS rebinding protection)
	const originResult = validateOrigin(request)
	if (originResult instanceof Response) {
		return originResult
	}

	const sessionId = getSessionId(request)
	if (!sessionId) {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32600,
					message: 'Missing MCP-Session-Id header',
				},
			},
			{ status: 400 },
		)
	}

	// Build resource URL for OAuth discovery (use same logic as action)
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

	const accessToken = authHeader.slice(7)

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

	const deleted = deleteSession(sessionId, tokenData)
	if (!deleted) {
		// Session doesn't exist, already expired, or doesn't belong to user
		return new Response(null, { status: 404 })
	}

	return new Response(null, { status: 204 })
}

/**
 * Handle POST requests for JSON-RPC messages (Streamable HTTP transport)
 */
export async function action({ request }: ActionFunctionArgs) {
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return handlePreflight(request)
	}

	// Handle session termination
	if (request.method === 'DELETE') {
		return handleDelete(request)
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

	// Handle different MCP methods
	try {
		const { method, params, id } = jsonRpcRequest

		// Handle notifications (no id) - return 202 Accepted
		if (id === undefined || id === null) {
			const headers = createMCPHeaders({
				origin: originResult.origin,
			})
			return new Response(null, { status: 202, headers })
		}

		// Get or validate session for non-initialize requests
		let sessionId = getSessionId(request)
		let session = sessionId ? getSession(sessionId, tokenData) : null

		// Initialize handshake - creates a new session
		if (method === 'initialize') {
			// Create new session
			const newSession = createSession(tokenData)
			sessionId = newSession.sessionId

			const result = {
				protocolVersion: MCP_PROTOCOL_VERSION,
				capabilities: {
					tools: {},
				},
				serverInfo: {
					name: 'epic-startup-mcp',
					version: '1.0.0',
				},
			}

			// Determine response type based on Accept header
			const responseType = negotiateResponseType(request)

			if (responseType === 'sse') {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					sessionId,
					originResult.origin,
				)
			}

			const headers = createMCPHeaders({
				sessionId,
				origin: originResult.origin,
			})

			return Response.json({ jsonrpc: '2.0', id, result }, { headers })
		}

		// Check for legacy client (no MCP-Protocol-Version header)
		const protocolVersionHeader = request.headers.get('MCP-Protocol-Version')
		const isLegacyClient = !protocolVersionHeader

		// For Streamable HTTP clients (2025-11-25), require a valid session
		// For legacy clients (2024-11-05), session is optional
		if (!isLegacyClient) {
			if (!session && sessionId) {
				// Session expired or invalid
				return Response.json(
					{
						jsonrpc: '2.0',
						id,
						error: {
							code: -32600,
							message: 'Session not found or expired',
						},
					},
					{ status: 404 },
				)
			}

			if (!sessionId) {
				// No session header on non-initialize request
				return Response.json(
					{
						jsonrpc: '2.0',
						id,
						error: {
							code: -32600,
							message:
								'Missing MCP-Session-Id header. Please initialize first.',
						},
					},
					{ status: 400 },
				)
			}
		}

		// Helper to create response headers (legacy clients don't expect MCP headers)
		const getResponseHeaders = () => {
			if (isLegacyClient) {
				const headers = new Headers({ 'Content-Type': 'application/json' })
				if (originResult.origin) {
					headers.set('Access-Control-Allow-Origin', originResult.origin)
				}
				return headers
			}
			return createMCPHeaders({
				sessionId: sessionId || undefined,
				origin: originResult.origin,
			})
		}

		// List available tools
		if (method === 'tools/list') {
			const tools = getToolDefinitions()
			const result = { tools }

			const responseType = negotiateResponseType(request)
			if (responseType === 'sse' && !isLegacyClient) {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					sessionId || '',
					originResult.origin,
				)
			}

			return Response.json(
				{ jsonrpc: '2.0', id, result },
				{ headers: getResponseHeaders() },
			)
		}

		// Call a tool
		if (method === 'tools/call') {
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
					name: params.name,
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
				params.name,
				tokenData.authorizationId,
				request,
			)

			const responseType = negotiateResponseType(request)
			if (responseType === 'sse' && !isLegacyClient) {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result },
					sessionId || '',
					originResult.origin,
				)
			}

			return Response.json(
				{ jsonrpc: '2.0', id, result },
				{ headers: getResponseHeaders() },
			)
		}

		// Ping/pong for keepalive
		if (method === 'ping') {
			const responseType = negotiateResponseType(request)
			if (responseType === 'sse' && !isLegacyClient) {
				return createSseResponse(
					{ jsonrpc: '2.0', id, result: {} },
					sessionId || '',
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
					message: `Method not found: ${method}`,
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
				id: jsonRpcRequest.id,
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
function createSseResponse(
	jsonRpcResponse: object,
	sessionId: string,
	origin?: string,
): Response {
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
		sessionId,
		origin,
		contentType: 'text/event-stream',
	})
	headers.set('Cache-Control', 'no-cache')
	headers.set('Connection', 'keep-alive')

	return new Response(stream, { status: 200, headers })
}

/**
 * Handle GET requests for SSE transport
 *
 * Supports two modes:
 * 1. Streamable HTTP (2025-11-25): Requires MCP-Session-Id, used for server-to-client messages
 * 2. Legacy SSE (2024-11-05): No session required, returns endpoint event for backwards compatibility
 */
export async function loader({ request }: LoaderFunctionArgs) {
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

	// Check rate limit for SSE connection (IP-based)
	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		RATE_LIMITS.sseConnection,
	)

	if (!rateLimitCheck.allowed) {
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	// Check if this is a legacy SSE client (no MCP-Session-Id header)
	// Per backwards compatibility spec: old clients expect GET to return SSE with endpoint event
	const sessionId = getSessionId(request)
	const protocolVersion = request.headers.get('MCP-Protocol-Version')

	if (!sessionId && !protocolVersion) {
		// Legacy SSE transport (2024-11-05) - return endpoint event pointing to POST
		return createLegacySseResponse(request, originResult.origin)
	}

	// Streamable HTTP transport (2025-11-25)
	// Validate protocol version for new clients
	const protocolError = validateProtocolVersion(request)
	if (protocolError) {
		return protocolError
	}

	// Check Accept header - must include text/event-stream for Streamable HTTP GET
	const accept = request.headers.get('Accept') || ''
	if (!accept.includes('text/event-stream')) {
		return new Response('Method Not Allowed', {
			status: 405,
			headers: {
				Allow: 'POST, DELETE, OPTIONS',
				'Content-Type': 'text/plain',
			},
		})
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

	const accessToken = authHeader.slice(7)

	// Validate access token or API key
	let tokenData = await validateAccessToken(accessToken)
	if (!tokenData) {
		tokenData = await validateApiKey(accessToken)
	}

	if (!tokenData) {
		return Response.json(
			{
				error: 'invalid_token',
				error_description: 'Invalid or expired access token',
			},
			{ status: 401 },
		)
	}

	// Require valid session for Streamable HTTP GET
	if (!sessionId) {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32600,
					message: 'Missing MCP-Session-Id header. Please initialize first.',
				},
			},
			{ status: 400 },
		)
	}

	const session = getSession(sessionId, tokenData)
	if (!session) {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32600,
					message: 'Session not found or expired',
				},
			},
			{ status: 404 },
		)
	}

	// Create SSE stream for server-to-client messages
	const encoder = new TextEncoder()
	let isClosed = false
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null

	const stream = new ReadableStream({
		start(controller) {
			// Send initial event with ID to prime client for reconnection
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
		sessionId,
		origin: originResult.origin,
		contentType: 'text/event-stream',
	})
	headers.set('Cache-Control', 'no-cache')
	headers.set('Connection', 'keep-alive')

	return new Response(stream, { status: 200, headers })
}

/**
 * Create legacy SSE response for backwards compatibility with 2024-11-05 clients
 *
 * Old clients expect GET to return an SSE stream with an 'endpoint' event
 * containing the URL to POST messages to
 */
function createLegacySseResponse(request: Request, origin?: string): Response {
	const encoder = new TextEncoder()
	let isClosed = false
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null

	// Build the POST endpoint URL (same URL, just for POST)
	// Use getDomainUrl to handle proxy headers and protocol adjustments accurately
	const domainUrl = getDomainUrl(request)
	const postEndpoint = `${domainUrl}/mcp`

	const stream = new ReadableStream({
		start(controller) {
			// Send endpoint event as first message (legacy protocol requirement)
			controller.enqueue(
				encoder.encode(`event: endpoint\ndata: ${postEndpoint}\n\n`),
			)

			// Send periodic heartbeats to keep connection alive
			heartbeatInterval = setInterval(() => {
				if (!isClosed) {
					try {
						controller.enqueue(encoder.encode(`: ping\n\n`))
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

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	})

	if (origin) {
		headers.set('Access-Control-Allow-Origin', origin)
		headers.set('Vary', 'Origin')
	}

	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

	return new Response(stream, { status: 200, headers })
}
