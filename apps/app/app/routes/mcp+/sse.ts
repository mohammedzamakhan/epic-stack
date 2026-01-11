import { getClientIp } from '@repo/security'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import {
	logMCPToolInvoked,
	logMCPRateLimitExceeded,
} from '#app/utils/mcp/audit.server.ts'
import { validateAccessToken } from '#app/utils/mcp/oauth.server.ts'
import {
	getToolDefinitions,
	handleMCPRequest,
	type MCPToolRequest,
} from '#app/utils/mcp/server.server.ts'
import {
	checkRateLimit,
	RATE_LIMITS,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'

/**
 * MCP Server Endpoint
 *
 * This endpoint supports two MCP transports:
 * 1. streamableHttp (POST): Bidirectional JSON-RPC over HTTP (preferred by modern clients)
 * 2. SSE (GET): Server-Sent Events for streaming (fallback)
 *
 * Requirements:
 * - Validate access token from Authorization header
 * - Handle MCP protocol messages (initialize, tools/list, tools/call)
 * - Support both transport mechanisms
 * - Clean up resources on disconnect
 * - Handle token expiration
 */

/**
 * Handle POST requests for streamableHttp transport
 * This is the preferred transport for modern MCP clients like Cursor
 */
export async function action({ request }: ActionFunctionArgs) {
	// Import to register tools (side-effect import)
	await import('#app/utils/mcp/tools.server.ts')

	console.log('[MCP SSE] POST request received')
	console.log('[MCP SSE] URL:', request.url)
	console.log('[MCP SSE] Method:', request.method)
	console.log(
		'[MCP SSE] Headers:',
		Object.fromEntries(request.headers.entries()),
	)

	// Extract access token from Authorization header
	const authHeader = request.headers.get('authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		console.log('[MCP SSE] No valid Authorization header, returning 401')
		return new Response('Unauthorized', {
			status: 401,
			headers: {
				'Content-Type': 'text/plain',
				'WWW-Authenticate': 'Bearer realm="MCP", error="invalid_token"',
			},
		})
	}

	console.log('[MCP SSE] Authorization header present')

	const accessToken = authHeader.slice(7) // Remove "Bearer " prefix

	// Validate access token
	const tokenData = await validateAccessToken(accessToken)
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
		console.log(
			'[MCP SSE] JSON-RPC request:',
			JSON.stringify(jsonRpcRequest, null, 2),
		)
	} catch (error) {
		console.log('[MCP SSE] Failed to parse JSON:', error)
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
		console.log('[MCP SSE] Handling method:', method)

		// Handle notifications (no id, no response expected)
		if (!id && method?.startsWith('notifications/')) {
			console.log('[MCP SSE] Received notification:', method)
			// Notifications don't require a response, just acknowledge with 204
			return new Response(null, { status: 204 })
		}

		// Initialize handshake
		if (method === 'initialize') {
			console.log('[MCP SSE] Returning initialize response')
			return Response.json({
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: '2024-11-05',
					capabilities: {
						tools: {},
					},
					serverInfo: {
						name: 'epic-startup-mcp',
						version: '1.0.0',
					},
				},
			})
		}

		// List available tools
		if (method === 'tools/list') {
			const tools = getToolDefinitions()
			return Response.json({
				jsonrpc: '2.0',
				id,
				result: {
					tools,
				},
			})
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

			return Response.json({
				jsonrpc: '2.0',
				id,
				result,
			})
		}

		// Ping/pong for keepalive
		if (method === 'ping') {
			return Response.json({
				jsonrpc: '2.0',
				id,
				result: {},
			})
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
 * Handle GET requests for SSE transport (fallback)
 */
export async function loader({ request }: LoaderFunctionArgs) {
	// Import to register tools (side-effect import)
	await import('#app/utils/mcp/tools.server.ts')

	console.log('[MCP SSE] GET request received')
	console.log('[MCP SSE] URL:', request.url)
	console.log('[MCP SSE] Method:', request.method)
	console.log(
		'[MCP SSE] Headers:',
		Object.fromEntries(request.headers.entries()),
	)

	// Check rate limit for SSE connection (IP-based)
	// This helps prevent connection exhaustion attacks
	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		RATE_LIMITS.sseConnection,
	)

	if (!rateLimitCheck.allowed) {
		console.log(`[MCP SSE] Rate limit exceeded for IP: ${clientIp}`)
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	// Only GET requests are allowed for SSE
	if (request.method !== 'GET') {
		console.log('[MCP SSE] Non-GET request to loader, returning 405')
		return Response.json(
			{
				error: 'invalid_request',
				error_description: 'Only GET requests are allowed for SSE transport',
			},
			{ status: 405 },
		)
	}

	// Extract access token from Authorization header
	const authHeader = request.headers.get('authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		console.log('[MCP SSE] No valid Authorization header, returning 401')
		console.log('[MCP SSE] Auth header value:', authHeader)
		return new Response('Unauthorized', {
			status: 401,
			headers: {
				'Content-Type': 'text/plain',
			},
		})
	}

	console.log('[MCP SSE] Authorization header present')

	const accessToken = authHeader.slice(7) // Remove "Bearer " prefix
	console.log(
		'[MCP SSE] Access token (first 10 chars):',
		accessToken.substring(0, 10),
	)

	// Validate access token
	const tokenData = await validateAccessToken(accessToken)
	if (!tokenData) {
		console.log('[MCP SSE] Token validation failed')
		return Response.json(
			{
				error: 'invalid_token',
				error_description: 'Invalid or expired access token',
			},
			{ status: 401 },
		)
	}

	console.log(
		'[MCP SSE] Token validated successfully for user:',
		tokenData.user.username,
	)
	console.log('[MCP SSE] Organization:', tokenData.organization.name)

	// Create SSE response with proper headers
	const encoder = new TextEncoder()
	let isClosed = false

	const stream = new ReadableStream({
		async start(controller) {
			// Send initial connection message
			try {
				const initMessage = {
					jsonrpc: '2.0',
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'epic-startup-mcp',
							version: '1.0.0',
						},
					},
				}

				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`),
				)

				// Simulate receiving tool requests from client
				// In a real implementation, this would be bidirectional communication
				// For now, we keep the connection open and ready for requests

				// Send a heartbeat every 30 seconds to keep connection alive
				const heartbeatInterval = setInterval(() => {
					if (!isClosed) {
						try {
							const heartbeat = {
								jsonrpc: '2.0',
								method: 'ping',
							}
							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`),
							)
						} catch (error) {
							clearInterval(heartbeatInterval)
							isClosed = true
						}
					} else {
						clearInterval(heartbeatInterval)
					}
				}, 30000)

				// Handle stream close
				const closeHandler = () => {
					isClosed = true
					clearInterval(heartbeatInterval)
					controller.close()
				}

				// Store close handler for cleanup
				;(controller as any).closeHandler = closeHandler
			} catch (error) {
				isClosed = true
				controller.error(error)
			}
		},

		cancel() {
			isClosed = true
		},
	})

	return new Response(stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	})
}
