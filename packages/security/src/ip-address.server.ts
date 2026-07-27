/**
 * IP Address Utilities
 *
 * Provides utilities for extracting client IP addresses from HTTP requests,
 * handling various proxy headers and request types.
 */

/**
 * Options for configuring IP address extraction behavior
 */
export interface GetClientIpOptions {
	/**
	 * Fallback value to return if no IP can be determined
	 * @default '127.0.0.1'
	 */
	fallback?: string
	/**
	 * Whether to return undefined instead of a fallback when IP cannot be determined
	 * @default false
	 */
	returnUndefined?: boolean
	/**
	 * Whether to trust proxy headers (Fly-Client-IP, X-Forwarded-For, etc.)
	 * Defaults to true unless TRUST_PROXY='false' environment variable is explicitly set
	 */
	trustProxy?: boolean
}

/**
 * Type guard to check if an object has a get method (Express-style request)
 */
function hasGetMethod(
	obj: any,
): obj is { get: (name: string) => string | undefined } {
	return typeof obj?.get === 'function'
}

/**
 * Type guard to check if an object has headers.get method (Web API Request)
 */
function hasHeadersGet(
	obj: any,
): obj is { headers: { get: (name: string) => string | null } } {
	return obj?.headers && typeof obj.headers.get === 'function'
}

/**
 * Extract client IP address from various request types and proxy headers
 *
 * This function handles both Express-style requests (with `.get()` method) and
 * Web API Requests (with `.headers.get()` method). It checks multiple headers
 * in order of reliability to determine the true client IP address.
 */
export function getClientIp(
	request: any,
	options: GetClientIpOptions & { returnUndefined: true },
): string | undefined
export function getClientIp(request: any, options?: GetClientIpOptions): string
export function getClientIp(
	request: any,
	options: GetClientIpOptions = {},
): string | undefined {
	const {
		fallback = '127.0.0.1',
		returnUndefined = false,
		trustProxy = process.env.TRUST_PROXY !== 'false',
	} = options

	// Handle null/undefined requests early
	if (request == null) {
		return returnUndefined ? undefined : fallback
	}

	// If proxy headers are untrusted, rely strictly on direct request connection IP
	if (!trustProxy) {
		if (request.ip) return request.ip
		if (request.socket?.remoteAddress) return request.socket.remoteAddress
		return returnUndefined ? undefined : fallback
	}

	// Helper function to get header value regardless of request type
	const getHeader = (name: string): string | null | undefined => {
		if (hasGetMethod(request)) {
			// Express-style request
			return request.get(name)
		} else if (hasHeadersGet(request)) {
			// Web API Request
			return request.headers.get(name)
		}
		return undefined
	}

	// Check various headers for the real IP address in order of reliability
	const flyClientIp = getHeader('Fly-Client-IP')
	const cfConnectingIp = getHeader('CF-Connecting-IP')
	const realIp = getHeader('X-Real-IP')
	const forwarded = getHeader('X-Forwarded-For')

	// Prefer more reliable headers first
	if (flyClientIp) return flyClientIp
	if (cfConnectingIp) return cfConnectingIp
	if (realIp) return realIp

	if (forwarded) {
		// X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
		// Take the first one (client IP)
		const clientIp = forwarded.split(',')[0]?.trim()
		if (clientIp) return clientIp
	}

	// Try to get IP from request object directly (Express)
	if (request.ip) {
		return request.ip
	}

	// No IP found, return fallback or undefined based on options
	return returnUndefined ? undefined : fallback
}
