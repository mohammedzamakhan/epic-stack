import { LRUCache } from 'lru-cache'
import type { Context, Next } from 'hono'

interface RateLimitConfig {
	windowMs: number
	maxRequests: number
}

const limiters = new Map<string, LRUCache<string, number[]>>()

function getLimiter(name: string, config: RateLimitConfig) {
	if (!limiters.has(name)) {
		limiters.set(
			name,
			new LRUCache<string, number[]>({
				max: 5000,
				ttl: config.windowMs,
			}),
		)
	}
	return limiters.get(name)!
}

/**
 * Clear all rate limit caches (useful for testing or dev resets).
 */
export function resetRateLimits() {
	limiters.clear()
	globalSendTimestamps = []
}

export function rateLimit(name: string, config: RateLimitConfig) {
	const cache = getLimiter(name, config)

	return async (c: Context, next: Next) => {
		// Bypass rate limiting in development mode
		if (process.env.NODE_ENV !== 'production') {
			return await next()
		}

		// IP resolution priority for rate limiting:
		// 1. fly-client-ip: Set by Fly.io's proxy — most reliable, cannot be spoofed by clients
		// 2. Last x-forwarded-for value: Appended by our trusted upstream proxy (sites app)
		// 3. x-real-ip: Fallback only — can be set by clients if not stripped by upstream
		const forwardedFor = c.req.header('x-forwarded-for')
		const ip =
			c.req.header('fly-client-ip') ||
			(forwardedFor ? forwardedFor.split(',').pop()?.trim() : null) ||
			c.req.header('x-real-ip') ||
			'unknown'

		const now = Date.now()
		const windowStart = now - config.windowMs

		let timestamps = cache.get(ip) || []
		// Filter out old timestamps
		timestamps = timestamps.filter((t) => t > windowStart)

		if (timestamps.length >= config.maxRequests) {
			const resetTime = timestamps[0]! + config.windowMs
			const retryAfter = Math.ceil((resetTime - now) / 1000)

			c.header('Retry-After', retryAfter.toString())
			c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())

			return c.json(
				{
					error: 'rate_limit_exceeded',
					error_description: 'Too many requests. Please try again later.',
					retry_after: retryAfter,
				},
				429,
			)
		}

		timestamps.push(now)
		cache.set(ip, timestamps)

		await next()
	}
}

/**
 * Imperative per-key rate limiter for use inside handlers (e.g. per-phone).
 * Returns { limited: true, retryAfter } if the key has exceeded maxRequests
 * within windowMs, otherwise records the request and returns { limited: false }.
 */
export function rateLimitByKey(
	name: string,
	key: string,
	config: RateLimitConfig,
): { limited: true; retryAfter: number } | { limited: false } {
	// Bypass in development mode
	if (process.env.NODE_ENV !== 'production') {
		return { limited: false }
	}

	const cache = getLimiter(name, config)
	const now = Date.now()
	const windowStart = now - config.windowMs

	let timestamps = cache.get(key) || []
	timestamps = timestamps.filter((t) => t > windowStart)

	if (timestamps.length >= config.maxRequests) {
		const resetTime = timestamps[0]! + config.windowMs
		const retryAfter = Math.ceil((resetTime - now) / 1000)
		return { limited: true, retryAfter }
	}

	timestamps.push(now)
	cache.set(key, timestamps)
	return { limited: false }
}

/**
 * Global send counter — caps total SMS sends across all IPs/phones
 * to prevent runaway Twilio costs. Defaults to 500/hour.
 */
const GLOBAL_SEND_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const GLOBAL_SEND_MAX = parseInt(process.env.GLOBAL_SMS_CAP || '500', 10)
let globalSendTimestamps: number[] = []

export function checkGlobalSendCap():
	{ limited: true; retryAfter: number } | { limited: false } {
	// Bypass in development mode
	if (process.env.NODE_ENV !== 'production') {
		return { limited: false }
	}

	const now = Date.now()
	const windowStart = now - GLOBAL_SEND_WINDOW_MS

	globalSendTimestamps = globalSendTimestamps.filter((t) => t > windowStart)

	if (globalSendTimestamps.length >= GLOBAL_SEND_MAX) {
		const resetTime = globalSendTimestamps[0]! + GLOBAL_SEND_WINDOW_MS
		const retryAfter = Math.ceil((resetTime - now) / 1000)
		return { limited: true, retryAfter }
	}

	globalSendTimestamps.push(now)
	return { limited: false }
}
