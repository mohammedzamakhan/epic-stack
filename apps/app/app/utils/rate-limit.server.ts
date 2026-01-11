import { prisma } from '@repo/database'

/**
 * Rate limiting utility for MCP OAuth endpoints
 * Implements sliding window rate limiting with database persistence
 */

export interface RateLimitConfig {
	maxRequests: number
	windowMs: number // Time window in milliseconds
}

export interface RateLimitKey {
	type: 'user' | 'ip' | 'token'
	value: string
}

// Rate limit configurations
export const RATE_LIMITS = {
	authorization: {
		maxRequests: 10,
		windowMs: 60 * 60 * 1000, // 1 hour
	},
	token: {
		maxRequests: 20,
		windowMs: 60 * 60 * 1000, // 1 hour
	},
	// Explicit SSE connection limit (separate from token limits)
	sseConnection: {
		maxRequests: 20,
		windowMs: 60 * 60 * 1000, // 1 hour
	},
	toolInvocation: {
		maxRequests: 1000,
		windowMs: 60 * 60 * 1000, // 1 hour
	},
}

/**
 * Check if a request should be rate limited
 * Uses sliding window algorithm with database persistence
 */
export async function checkRateLimit(
	key: RateLimitKey,
	config: RateLimitConfig,
): Promise<{
	allowed: boolean
	remaining: number
	resetAt: Date
}> {
	const now = new Date()
	const windowStart = new Date(now.getTime() - config.windowMs)

	// Create a unique identifier for this rate limit key
	const keyId = `${key.type}:${key.value}`

	try {
		// Clean up old entries outside the window
		await prisma.rateLimitEntry.deleteMany({
			where: {
				keyId,
				createdAt: {
					lt: windowStart,
				},
			},
		})

		// Count requests in the current window
		const count = await prisma.rateLimitEntry.count({
			where: {
				keyId,
				createdAt: {
					gte: windowStart,
				},
			},
		})

		const allowed = count < config.maxRequests
		const remaining = Math.max(0, config.maxRequests - count - 1)
		const resetAt = new Date(windowStart.getTime() + config.windowMs)

		// If allowed, record this request
		if (allowed) {
			await prisma.rateLimitEntry.create({
				data: {
					keyId,
					keyType: key.type,
					keyValue: key.value,
				},
			})
		}

		return {
			allowed,
			remaining,
			resetAt,
		}
	} catch (error) {
		// If database fails, allow the request but log the error
		console.error('Rate limit check failed:', error)
		return {
			allowed: true,
			remaining: config.maxRequests - 1,
			resetAt: new Date(now.getTime() + config.windowMs),
		}
	}
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(resetAt: Date) {
	const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000)

	return Response.json(
		{
			error: 'rate_limit_exceeded',
			error_description: 'Too many requests. Please try again later.',
			retry_after: retryAfter,
		},
		{
			status: 429,
			headers: {
				'Retry-After': retryAfter.toString(),
				'X-RateLimit-Reset': resetAt.toISOString(),
			},
		},
	)
}
