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

// Redact sensitive fields from logs
const redactPaths = [
	'*.password',
	'*.token',
	'*.accessToken',
	'*.refreshToken',
	'*.secret',
	'*.apiKey',
	'*.api_key',
	'*.sessionId',
	'*.cookie',
	'*.authorization',
	'*.creditCard',
	'*.ssn',
	'req.headers.authorization',
	'req.headers.cookie',
	'res.headers["set-cookie"]',
]

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

	// Use pretty printing in development
	if (isDevelopment) {
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

			// Send warnings to Sentry with lower severity
			if (typeof obj === 'object' && obj !== null) {
				Sentry.captureMessage(
					msg || obj.message || 'Warning logged',
					{
						level: 'warning',
						extra: obj,
					}
				)
			}
		},

		error: (obj: any, msg?: string, ...args: any[]) => {
			baseLogger.error(obj, msg, ...args)

			// Send errors to Sentry
			if (obj instanceof Error) {
				Sentry.captureException(obj, {
					extra: typeof msg === 'string' ? { message: msg } : msg,
				})
			} else if (typeof obj === 'object' && obj !== null && obj.err instanceof Error) {
				Sentry.captureException(obj.err, {
					extra: { ...obj, message: msg },
				})
			} else if (msg) {
				Sentry.captureException(new Error(msg), {
					extra: obj,
				})
			}
		},

		fatal: (obj: any, msg?: string, ...args: any[]) => {
			baseLogger.fatal(obj, msg, ...args)

			// Send fatal errors to Sentry with critical level
			if (obj instanceof Error) {
				Sentry.captureException(obj, {
					level: 'fatal',
					extra: typeof msg === 'string' ? { message: msg } : msg,
				})
			} else if (msg) {
				Sentry.captureException(new Error(msg), {
					level: 'fatal',
					extra: obj,
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
 * Masks the last octet of IPv4 addresses
 */
export function sanitizeIpAddress(ip: string): string {
	if (!ip) return 'unknown'

	// IPv4: mask last octet
	const ipv4Regex = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/
	const ipv4Match = ip.match(ipv4Regex)
	if (ipv4Match) {
		return `${ipv4Match[1]}.xxx`
	}

	// IPv6: mask last 80 bits (last 5 groups)
	const ipv6Regex = /^([0-9a-fA-F]{0,4}:){3}/
	const ipv6Match = ip.match(ipv6Regex)
	if (ipv6Match) {
		return `${ipv6Match[0]}xxxx:xxxx:xxxx:xxxx:xxxx`
	}

	return 'unknown'
}

/**
 * Utility to extract client IP from request headers
 */
export function getClientIp(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for')
	const realIp = request.headers.get('x-real-ip')
	const cfConnectingIp = request.headers.get('cf-connecting-ip')

	return cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown'
}
