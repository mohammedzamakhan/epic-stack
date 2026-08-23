/**
 * MCP Streamable HTTP Transport Utilities
 *
 * Implements the MCP 2026-07-28 Streamable HTTP transport specification:
 * - Protocol version validation
 * - Origin validation (DNS rebinding protection)
 * - Session management with MCP-Session-Id
 * - Content negotiation (JSON vs SSE)
 */

import crypto from 'node:crypto'

export const MCP_PROTOCOL_VERSION = '2026-07-28'

// Session store - in-memory for single instance deployments
// For multi-instance, consider Redis or database storage
interface MCPSession {
	sessionId: string
	userId: string
	organizationId: string
	authorizationId: string
	createdAt: Date
	lastSeenAt: Date
}

const sessions = new Map<string, MCPSession>()

// Session expiration: 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000

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
		// The spec says assume 2025-03-26, but we'll accept it
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
 * Get session ID from request header
 */
export function getSessionId(request: Request): string | null {
	return request.headers.get('MCP-Session-Id')
}

/**
 * Generate a new session ID
 */
function generateSessionId(): string {
	return crypto.randomUUID()
}

/**
 * Clean up expired sessions (call periodically)
 */
function cleanupExpiredSessions(): void {
	const now = Date.now()
	for (const [sessionId, session] of sessions) {
		if (now - session.lastSeenAt.getTime() > SESSION_TTL_MS) {
			sessions.delete(sessionId)
		}
	}
}

/**
 * Create or retrieve a session for the initialize request
 */
export function createSession(tokenData: {
	user: { id: string }
	organization: { id: string }
	authorizationId: string
}): { sessionId: string; isNew: boolean } {
	// Clean up expired sessions periodically
	cleanupExpiredSessions()

	const sessionId = generateSessionId()
	const now = new Date()

	sessions.set(sessionId, {
		sessionId,
		userId: tokenData.user.id,
		organizationId: tokenData.organization.id,
		authorizationId: tokenData.authorizationId,
		createdAt: now,
		lastSeenAt: now,
	})

	return { sessionId, isNew: true }
}

/**
 * Get an existing session and validate it belongs to the token
 */
export function getSession(
	sessionId: string,
	tokenData: {
		user: { id: string }
		organization: { id: string }
	},
): MCPSession | null {
	// Clean up expired sessions periodically
	cleanupExpiredSessions()

	const session = sessions.get(sessionId)

	if (!session) {
		return null
	}

	// Validate session belongs to this token's user and org
	if (
		session.userId !== tokenData.user.id ||
		session.organizationId !== tokenData.organization.id
	) {
		return null
	}

	// Check if session has expired
	if (Date.now() - session.lastSeenAt.getTime() > SESSION_TTL_MS) {
		sessions.delete(sessionId)
		return null
	}

	// Update last seen time
	session.lastSeenAt = new Date()

	return session
}

/**
 * Delete a session (for explicit termination)
 */
export function deleteSession(
	sessionId: string,
	tokenData: {
		user: { id: string }
		organization: { id: string }
	},
): boolean {
	const session = sessions.get(sessionId)
	if (!session) {
		return false
	}

	// Validate session belongs to this token's user and org
	if (
		session.userId !== tokenData.user.id ||
		session.organizationId !== tokenData.organization.id
	) {
		return false
	}

	return sessions.delete(sessionId)
}

/**
 * Create standard response headers for MCP responses
 */
export function createMCPHeaders(options: {
	sessionId?: string
	origin?: string
	contentType?: string
}): Headers {
	const headers = new Headers()

	headers.set('Content-Type', options.contentType || 'application/json')
	headers.set('MCP-Protocol-Version', MCP_PROTOCOL_VERSION)

	if (options.sessionId) {
		headers.set('MCP-Session-Id', options.sessionId)
	}

	// CORS headers only if origin is provided (validated)
	if (options.origin) {
		headers.set('Access-Control-Allow-Origin', options.origin)
		headers.set('Vary', 'Origin')
		headers.set(
			'Access-Control-Allow-Headers',
			'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Accept',
		)
		headers.set('Access-Control-Expose-Headers', 'MCP-Session-Id')
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

	headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
	headers.set(
		'Access-Control-Allow-Headers',
		'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Accept',
	)
	headers.set('Access-Control-Expose-Headers', 'MCP-Session-Id')
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
