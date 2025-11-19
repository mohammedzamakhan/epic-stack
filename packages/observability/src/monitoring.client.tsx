import * as Sentry from '@sentry/react-router'

export interface MonitoringOptions {
	/**
	 * Sentry DSN for error tracking
	 */
	dsn: string
	/**
	 * Environment name (e.g., 'production', 'development')
	 */
	environment: string
	/**
	 * Sample rate for performance monitoring (0.0 to 1.0)
	 * @default 0.1 in production, 1.0 in development
	 */
	tracesSampleRate?: number
	/**
	 * Sample rate for session replays (0.0 to 1.0)
	 * @default 0.05 in production, 0.1 in development
	 */
	replaysSessionSampleRate?: number
	/**
	 * Sample rate for replays on error (0.0 to 1.0)
	 * @default 1.0
	 */
	replaysOnErrorSampleRate?: number
}

export function init(options: MonitoringOptions) {
	const {
		dsn,
		environment,
		tracesSampleRate,
		replaysSessionSampleRate,
		replaysOnErrorSampleRate = 1.0,
	} = options

	// Default sample rates based on environment
	const defaultTracesSampleRate = environment === 'production' ? 0.1 : 1.0
	const defaultReplaysSessionSampleRate =
		environment === 'production' ? 0.05 : 0.1

	Sentry.init({
		dsn,
		environment,
		beforeSend(event) {
			if (event.request?.url) {
				const url = new URL(event.request.url)
				if (
					url.protocol === 'chrome-extension:' ||
					url.protocol === 'moz-extension:'
				) {
					// This error is from a browser extension, ignore it
					return null
				}
			}
			return event
		},
		integrations: [
			Sentry.replayIntegration(),
			Sentry.browserProfilingIntegration(),
		],

		// Performance monitoring: configurable with defaults optimized for production
		// Reduced from 100% to significantly improve page load performance
		// Note: Sentry's beforeSend hook can be used to filter out non-critical
		// transactions if more granular control is needed in the future
		tracesSampleRate: tracesSampleRate ?? defaultTracesSampleRate,

		// Capture Replay for sessions
		// Lower in production to reduce bandwidth and storage costs
		// 100% of sessions with errors are always captured
		replaysSessionSampleRate:
			replaysSessionSampleRate ?? defaultReplaysSessionSampleRate,
		replaysOnErrorSampleRate,
	})
}
