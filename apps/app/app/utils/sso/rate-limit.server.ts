import { rateLimit } from 'express-rate-limit'

// Rate limiting configuration for SSO endpoints
const IS_PROD = process.env.NODE_ENV === 'production'

// Base rate limit settings
const baseRateLimit = {
	windowMs: 15 * 60 * 1000, // 15 minutes
	standardHeaders: true,
	legacyHeaders: false,
	// Custom key generator to include organization in rate limiting
	keyGenerator: (req: any) => {
		const organizationSlug = req.params?.organizationSlug || 'unknown'
		const ip = req.ip || req.connection?.remoteAddress || 'unknown'
		return `sso:${organizationSlug}:${ip}`
	},
	// Custom error handler
	handler: (req: any, res: any) => {
		res.status(429).json({
			error: 'Too Many Requests',
			message: 'Too many SSO authentication attempts. Please try again later.',
			retryAfter: Math.ceil(baseRateLimit.windowMs / 1000),
		})
	},
}

// Strict rate limiting for SSO authentication initiation
// This prevents abuse of the SSO flow initiation
export const ssoAuthInitiateRateLimit = rateLimit({
	...baseRateLimit,
	limit: IS_PROD ? 10 : 1000, // 10 attempts per 15 minutes in production
	message: {
		error: 'Too Many SSO Requests',
		message:
			'Too many SSO authentication attempts. Please wait before trying again.',
	},
})

// Rate limiting for SSO callback handling
// Slightly more lenient as callbacks are legitimate responses from IdP
export const ssoCallbackRateLimit = rateLimit({
	...baseRateLimit,
	limit: IS_PROD ? 20 : 1000, // 20 callbacks per 15 minutes in production
	message: {
		error: 'Too Many Callback Requests',
		message: 'Too many SSO callback attempts. Please wait before trying again.',
	},
})

// Rate limiting for SSO configuration testing
// Very strict as this is an admin operation that hits external services
export const ssoConfigTestRateLimit = rateLimit({
	...baseRateLimit,
	windowMs: 5 * 60 * 1000, // 5 minutes
	limit: IS_PROD ? 5 : 100, // 5 tests per 5 minutes in production
	keyGenerator: (req: any) => {
		// Rate limit by user ID for config testing
		const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous'
		return `sso-test:${userId}`
	},
	message: {
		error: 'Too Many Test Requests',
		message:
			'Too many SSO configuration tests. Please wait before testing again.',
	},
})

// Rate limiting for SSO configuration changes
// Moderate rate limiting for admin operations
export const ssoConfigChangeRateLimit = rateLimit({
	...baseRateLimit,
	windowMs: 10 * 60 * 1000, // 10 minutes
	limit: IS_PROD ? 15 : 100, // 15 changes per 10 minutes in production
	keyGenerator: (req: any) => {
		const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous'
		const organizationId =
			req.body?.organizationId || req.params?.organizationId || 'unknown'
		return `sso-config:${organizationId}:${userId}`
	},
	message: {
		error: 'Too Many Configuration Changes',
		message:
			'Too many SSO configuration changes. Please wait before making more changes.',
	},
})

// In-memory store for tracking suspicious activity
interface SuspiciousActivity {
	count: number
	firstSeen: number
	lastSeen: number
	blocked: boolean
}

const suspiciousActivityStore = new Map<string, SuspiciousActivity>()

// Clean up old entries every hour
setInterval(
	() => {
		const oneHourAgo = Date.now() - 60 * 60 * 1000
		for (const [key, activity] of suspiciousActivityStore.entries()) {
			if (activity.lastSeen < oneHourAgo) {
				suspiciousActivityStore.delete(key)
			}
		}
	},
	60 * 60 * 1000,
)

/**
 * Track and detect suspicious SSO activity patterns
 */
export function trackSuspiciousActivity(
	identifier: string,
	activityType: 'failed_auth' | 'invalid_config' | 'repeated_errors',
): boolean {
	const key = `suspicious:${activityType}:${identifier}`
	const now = Date.now()

	let activity = suspiciousActivityStore.get(key)
	if (!activity) {
		activity = {
			count: 0,
			firstSeen: now,
			lastSeen: now,
			blocked: false,
		}
	}

	activity.count++
	activity.lastSeen = now

	// Block if too many suspicious activities in a short time
	const timeWindow = 30 * 60 * 1000 // 30 minutes
	const maxActivities = 10

	if (
		activity.count >= maxActivities &&
		now - activity.firstSeen < timeWindow
	) {
		activity.blocked = true
	}

	suspiciousActivityStore.set(key, activity)

	return activity.blocked
}

/**
 * Check if an identifier is currently blocked due to suspicious activity
 */
export function isSuspiciousActivityBlocked(
	identifier: string,
	activityType: 'failed_auth' | 'invalid_config' | 'repeated_errors',
): boolean {
	const key = `suspicious:${activityType}:${identifier}`
	const activity = suspiciousActivityStore.get(key)

	if (!activity) return false

	// Unblock after 1 hour
	const oneHourAgo = Date.now() - 60 * 60 * 1000
	if (activity.blocked && activity.lastSeen < oneHourAgo) {
		suspiciousActivityStore.delete(key)
		return false
	}

	return activity.blocked
}

/**
 * Middleware to check for suspicious activity before processing SSO requests
 */
export function checkSuspiciousActivity(
	activityType: 'failed_auth' | 'invalid_config' | 'repeated_errors',
) {
	return (req: any, res: any, next: any) => {
		const organizationSlug = req.params?.organizationSlug || 'unknown'
		const ip = req.ip || req.connection?.remoteAddress || 'unknown'
		const identifier = `${organizationSlug}:${ip}`

		if (isSuspiciousActivityBlocked(identifier, activityType)) {
			return res.status(429).json({
				error: 'Suspicious Activity Detected',
				message:
					'Your request has been blocked due to suspicious activity. Please try again later.',
				retryAfter: 3600, // 1 hour
			})
		}

		next()
	}
}

/**
 * Helper to extract rate limit info from headers
 */
export function getRateLimitInfo(headers: Headers): {
	limit?: number
	remaining?: number
	reset?: number
	retryAfter?: number
} {
	return {
		limit: headers.get('x-ratelimit-limit')
			? parseInt(headers.get('x-ratelimit-limit')!)
			: undefined,
		remaining: headers.get('x-ratelimit-remaining')
			? parseInt(headers.get('x-ratelimit-remaining')!)
			: undefined,
		reset: headers.get('x-ratelimit-reset')
			? parseInt(headers.get('x-ratelimit-reset')!)
			: undefined,
		retryAfter: headers.get('retry-after')
			? parseInt(headers.get('retry-after')!)
			: undefined,
	}
}
