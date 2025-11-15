import pino from 'pino'
import type { Logger as PinoLogger } from 'pino'
import * as Sentry from '@sentry/react-router'

/**
 * Centralized logger utility using Pino
 *
 * Features:
 * - Structured JSON logging
 * - Automatic sensitive data redaction
 * - Pretty printing in development
 * - Integration with Sentry for errors
 * - Child loggers for context
 *
 * @example
 * ```typescript
 * import { logger } from './logger.server'
 *
 * // Basic logging
 * logger.info('User logged in')
 * logger.error({ err: error, userId }, 'Failed to process request')
 *
 * // Child logger with context
 * const requestLogger = logger.child({ requestId: '123', userId: 'user-456' })
 * requestLogger.info('Processing payment')
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Redact sensitive fields from logs - expanded for OAuth, SSO, and authentication patterns
const redactPaths = [
	// Password fields
	'*.password',
	'*.Password',
	'*.newPassword',
	'*.oldPassword',
	'*.confirmPassword',

	// Token fields
	'*.token',
	'*.Token',
	'*.accessToken',
	'*.access_token',
	'*.refreshToken',
	'*.refresh_token',
	'*.idToken',
	'*.id_token',
	'*.resetToken',
	'*.reset_token',
	'*.verificationToken',
	'*.verification_token',

	// Secret and API key fields
	'*.secret',
	'*.Secret',
	'*.clientSecret',
	'*.client_secret',
	'*.apiKey',
	'*.api_key',
	'*.apiSecret',
	'*.api_secret',
	'*.accessKey',
	'*.access_key',
	'*.secretKey',
	'*.secret_key',

	// Private keys and credentials
	'*.privateKey',
	'*.private_key',
	'*.encryptionKey',
	'*.encryption_key',
	'*.credentials',
	'*.credentials.*',

	// Session and auth headers
	'*.sessionId',
	'*.session_id',
	'*.cookie',
	'*.Cookie',
	'*.authorization',
	'*.Authorization',
	'req.headers.authorization',
	'req.headers.cookie',
	'res.headers["set-cookie"]',

	// SSO-specific fields
	'*.samlResponse',
	'*.saml_response',
	'*.assertion',
	'*.SAMLResponse',
	'*.code', // OAuth authorization codes

	// Financial and PII
	'*.creditCard',
	'*.credit_card',
	'*.cardNumber',
	'*.card_number',
	'*.cvv',
	'*.ssn',
	'*.socialSecurityNumber',
]

/**
 * Sanitize data for Sentry to prevent sensitive data leakage
 * Pino's redaction doesn't apply to Sentry's extra field
 */
function sanitizeForSentry(obj: any): any {
	if (!obj || typeof obj !== 'object') return obj

	// Deep clone to avoid mutating original
	const sanitized = JSON.parse(JSON.stringify(obj))

	// List of sensitive key patterns (case-insensitive)
	const sensitivePatterns = [
		'password', 'token', 'secret', 'key', 'apikey', 'api_key',
		'accesstoken', 'refreshtoken', 'authorization', 'cookie',
		'credential', 'privatekey', 'saml', 'assertion', 'ssn',
		'creditcard', 'cardnumber', 'cvv'
	]

	function redactObject(data: any): any {
		if (!data || typeof data !== 'object') return data

		for (const [key, value] of Object.entries(data)) {
			const keyLower = key.toLowerCase()

			// Check if key matches sensitive pattern
			const isSensitive = sensitivePatterns.some(pattern =>
				keyLower.includes(pattern)
			)

			if (isSensitive) {
				data[key] = '[REDACTED]'
			} else if (typeof value === 'object' && value !== null) {
				// Recursively redact nested objects
				data[key] = redactObject(value)
			}
		}

		return data
	}

	return redactObject(sanitized)
}

/**
 * Validate IP address format to prevent injection attacks
 */
function validateIpAddress(ip: string): string {
	if (!ip || ip === 'unknown') return 'unknown'

	const trimmed = ip.trim()

	// IPv4 validation
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
	const ipv4Match = trimmed.match(ipv4Regex)
	if (ipv4Match) {
		// Verify each octet is 0-255
		const octets = [ipv4Match[1]!, ipv4Match[2]!, ipv4Match[3]!, ipv4Match[4]!]
		const valid = octets.every(octet => {
			const num = parseInt(octet, 10)
			return num >= 0 && num <= 255
		})
		return valid ? trimmed : 'invalid'
	}

	// IPv6 validation (basic check for valid characters and structure)
	const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
	if (ipv6Regex.test(trimmed)) {
		return trimmed
	}

	// Compressed IPv6 (::)
	if (/^::1$|^([0-9a-fA-F]{0,4}::?)+[0-9a-fA-F]{0,4}$/.test(trimmed)) {
		return trimmed
	}

	return 'invalid'
}

/**
 * Sanitize URL to redact sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
	try {
		const parsed = new URL(url)
		const sensitiveParams = [
			'token', 'access_token', 'accessToken', 'refresh_token', 'refreshToken',
			'password', 'api_key', 'apikey', 'apiKey', 'key',
			'session', 'sessionId', 'session_id',
			'secret', 'code', 'authorization',
			'reset_token', 'resetToken', 'verification_token',
			'client_secret', 'clientSecret'
		]

		sensitiveParams.forEach(param => {
			if (parsed.searchParams.has(param)) {
				parsed.searchParams.set(param, '[REDACTED]')
			}
		})

		return parsed.toString()
	} catch {
		return '[INVALID_URL]'
	}
}

/**
 * Create the base Pino logger instance
 */
const createLogger = (): PinoLogger => {
	const baseConfig: pino.LoggerOptions = {
		level: isTest ? 'silent' : isDevelopment ? 'debug' : 'info',
		redact: {
			paths: redactPaths,
			censor: '[REDACTED]',
		},
		formatters: {
			level: (label) => {
				return { level: label }
			},
			bindings: (bindings) => {
				return {
					pid: bindings.pid,
					hostname: bindings.hostname,
					node_version: process.version,
				}
			},
		},
		timestamp: pino.stdTimeFunctions.isoTime,
		// Serialize errors properly
		serializers: {
			err: pino.stdSerializers.err,
			error: pino.stdSerializers.err,
			req: pino.stdSerializers.req,
			res: pino.stdSerializers.res,
		},
	}

	// Use pretty printing in development with graceful fallback
	if (isDevelopment) {
		try {
			return pino({
				...baseConfig,
				transport: {
					target: 'pino-pretty',
					options: {
						colorize: true,
						translateTime: 'HH:MM:ss.l',
						ignore: 'pid,hostname,node_version',
						singleLine: false,
						messageFormat: '{msg}',
					},
				},
			})
		} catch (error) {
			console.warn('pino-pretty not available, falling back to JSON logs:', error)
			return pino(baseConfig)
		}
	}

	// Production: structured JSON
	return pino(baseConfig)
}

/**
 * Base logger instance
 */
export const logger = createLogger()

/**
 * Enhanced logger that integrates with Sentry
 * Automatically captures errors and warnings to Sentry
 */
export const createSentryLogger = (baseLogger: PinoLogger = logger) => {
	return {
		trace: baseLogger.trace.bind(baseLogger),
		debug: baseLogger.debug.bind(baseLogger),
		info: baseLogger.info.bind(baseLogger),

		warn: (obj: any, msg?: string, ...args: any[]) => {
			baseLogger.warn(obj, msg, ...args)

			// Send warnings to Sentry with lower severity (sanitized)
			if (typeof obj === 'object' && obj !== null) {
				Sentry.captureMessage(
					msg || obj.message || 'Warning logged',
					{
						level: 'warning',
						extra: sanitizeForSentry(obj),
					}
				)
			}
		},

		error: (obj: any, msg?: string, ...args: any[]) => {
			baseLogger.error(obj, msg, ...args)

			// Send errors to Sentry (sanitized)
			if (obj instanceof Error) {
				Sentry.captureException(obj, {
					extra: sanitizeForSentry(
						typeof msg === 'string' ? { message: msg } : msg
					),
				})
			} else if (typeof obj === 'object' && obj !== null && obj.err instanceof Error) {
				Sentry.captureException(obj.err, {
					extra: sanitizeForSentry({ ...obj, message: msg }),
				})
			} else if (msg) {
				Sentry.captureException(new Error(msg), {
					extra: sanitizeForSentry(obj),
				})
			}
		},

		fatal: (obj: any, msg?: string, ...args: any[]) => {
			baseLogger.fatal(obj, msg, ...args)

			// Send fatal errors to Sentry with critical level (sanitized)
			// Use explicit captureException for guaranteed synchronous capture
			if (obj instanceof Error) {
				Sentry.captureException(obj, {
					level: 'fatal',
					extra: sanitizeForSentry(
						typeof msg === 'string' ? { message: msg } : msg
					),
				})
			} else if (typeof obj === 'object' && obj !== null && obj.err instanceof Error) {
				Sentry.captureException(obj.err, {
					level: 'fatal',
					extra: sanitizeForSentry({ ...obj, message: msg }),
				})
			} else if (msg) {
				Sentry.captureException(new Error(msg), {
					level: 'fatal',
					extra: sanitizeForSentry(obj),
				})
			}
		},

		child: (bindings: Record<string, any>) => {
			return createSentryLogger(baseLogger.child(bindings))
		},
	}
}

/**
 * Default export with Sentry integration
 */
export const sentryLogger = createSentryLogger(logger)

/**
 * Create a child logger with specific context
 * Useful for adding request IDs, user IDs, etc.
 *
 * @example
 * ```typescript
 * const requestLogger = createChildLogger({ requestId: req.headers['x-request-id'] })
 * requestLogger.info('Processing request')
 * ```
 */
export function createChildLogger(bindings: Record<string, any>) {
	return logger.child(bindings)
}

/**
 * Helper to sanitize IP addresses for privacy compliance
 * Masks the last octet of IPv4 addresses and last groups of IPv6
 */
export function sanitizeIpAddress(ip: string): string {
	if (!ip) return 'unknown'

	// IPv4: mask last octet
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/
	const ipv4Match = ip.match(ipv4Regex)
	if (ipv4Match) {
		// Verify valid octets
		const octets = [ipv4Match[1]!, ipv4Match[2]!, ipv4Match[3]!]
		const valid = octets.every(octet => {
			const num = parseInt(octet, 10)
			return num >= 0 && num <= 255
		})
		return valid ? `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.xxx` : 'unknown'
	}

	// IPv6: keep first 48 bits (first 3 groups), mask the rest
	// Handle both expanded and compressed notation
	const ipv6Parts = ip.split(':')
	if (ipv6Parts.length >= 3 && /^[0-9a-fA-F:]+$/.test(ip)) {
		// Take first 3 groups and mask the rest
		const prefix = ipv6Parts.slice(0, 3).join(':')
		return `${prefix}:xxxx:xxxx:xxxx:xxxx:xxxx`
	}

	// Handle compressed IPv6 (::)
	if (ip.includes('::')) {
		const parts = ip.split('::')
		if (parts[0]) {
			const prefix = parts[0].split(':').slice(0, 3).join(':')
			return prefix ? `${prefix}::xxxx:xxxx:xxxx` : '::xxxx:xxxx:xxxx'
		}
		return '::xxxx:xxxx:xxxx'
	}

	return 'unknown'
}

/**
 * Utility to extract and validate client IP from request headers
 */
export function getClientIp(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for')
	const realIp = request.headers.get('x-real-ip')
	const cfConnectingIp = request.headers.get('cf-connecting-ip')

	const rawIp = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown'

	// Validate IP to prevent injection attacks
	return validateIpAddress(rawIp)
}
