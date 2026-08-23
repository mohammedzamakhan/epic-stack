/**
 * MCP Streamable HTTP Transport Utilities
 *
 * Implements the MCP 2026-07-28 Stateless HTTP transport specification:
 * - Protocol version validation
 * - Origin validation (DNS rebinding protection)
 * - Content negotiation (JSON vs SSE)
 * - Header-based routing (Mcp-Method, Mcp-Name)
 */

export const MCP_PROTOCOL_VERSION = '2026-07-28'

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
	const envOrigins = process.env.MCP_ALLOWED_ORIGINS
	if (envOrigins) {
		return envOrigins.split(',').map((o) => o.trim())
	}
	// Default: allow localhost for development
	return [
		'http://localhost:3001',
		'http://localhost:3000',
		'http://127.0.0.1:3001',
		'http://127.0.0.1:3000',
	]
}

/**
 * Validate the MCP-Protocol-Version header
 *
 * @returns null if valid, Response if invalid
 */
export function validateProtocolVersion(request: Request): Response | null {
	const protocolVersion = request.headers.get('MCP-Protocol-Version')

	// For backwards compatibility: if no header, assume 2025-03-26 (per spec)
	// But we only support 2026-07-28, so we'll be lenient during migration
	if (!protocolVersion) {
		// Allow requests without the header for backwards compatibility
		return null
	}

	if (protocolVersion !== MCP_PROTOCOL_VERSION) {
		return Response.json(
			{
				jsonrpc: '2.0',
				error: {
					code: -32600,
					message: `Unsupported protocol version: ${protocolVersion}. Expected: ${MCP_PROTOCOL_VERSION}`,
				},
			},
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
				},
			},
		)
	}

	return null
}

/**
 * Validate the Origin header for DNS rebinding protection
 *
 * @returns object with validated origin, or Response if validation fails
 */
export function validateOrigin(
	request: Request,
): { origin?: string } | Response {
	const origin = request.headers.get('Origin')

	// No Origin header = non-browser client, allow
	if (!origin) {
		return {}
	}

	const allowedOrigins = getAllowedOrigins()

	// Check if origin is in allowlist
	if (allowedOrigins.includes(origin)) {
		return { origin }
	}

	// Check for wildcard patterns (e.g., *.example.com)
	for (const allowed of allowedOrigins) {
		if (allowed.startsWith('*.')) {
			const domain = allowed.slice(2)
			try {
				const originUrl = new URL(origin)
				if (
					originUrl.hostname === domain ||
					originUrl.hostname.endsWith('.' + domain)
				) {
					return { origin }
				}
			} catch {
				// Invalid origin URL, continue checking
			}
		}
	}

	// Origin not allowed - return 403 Forbidden
	return Response.json(
		{
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Origin not allowed',
			},
		},
		{
			status: 403,
			headers: {
				'Content-Type': 'application/json',
			},
		},
	)
}

/**
 * Determine response type based on Accept header
 */
export function negotiateResponseType(request: Request): 'json' | 'sse' {
	const accept = request.headers.get('Accept') || ''

	// Check if SSE is explicitly preferred or listed
	if (accept.includes('text/event-stream')) {
		return 'sse'
	}

	return 'json'
}

/**
 * Create standard response headers for MCP responses
 */
export function createMCPHeaders(options: {
	origin?: string
	contentType?: string
}): Headers {
	const headers = new Headers()

	headers.set('Content-Type', options.contentType || 'application/json')
	headers.set('MCP-Protocol-Version', MCP_PROTOCOL_VERSION)

	// CORS headers only if origin is provided (validated)
	if (options.origin) {
		headers.set('Access-Control-Allow-Origin', options.origin)
		headers.set('Vary', 'Origin')
		headers.set(
			'Access-Control-Allow-Headers',
			'Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Accept',
		)
	}

	return headers
}

/**
 * Create CORS preflight response headers
 */
export function createPreflightHeaders(origin?: string): Headers {
	const headers = new Headers()

	if (origin) {
		headers.set('Access-Control-Allow-Origin', origin)
		headers.set('Vary', 'Origin')
	}

	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
	headers.set(
		'Access-Control-Allow-Headers',
		'Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Accept',
	)
	headers.set('Access-Control-Max-Age', '86400') // 24 hours

	return headers
}

/**
 * SSE helper: encode comment for keepalive
 */
export function encodeSseComment(text: string): string {
	return `: ${text}\n\n`
}

/**
 * SSE helper: encode event with ID for resumability
 */
export function encodeSseEvent(
	data: unknown,
	eventId?: string,
	retry?: number,
): string {
	let event = ''
	if (eventId) {
		event += `id: ${eventId}\n`
	}
	if (retry !== undefined) {
		event += `retry: ${retry}\n`
	}
	event += `data: ${JSON.stringify(data)}\n\n`
	return event
}
