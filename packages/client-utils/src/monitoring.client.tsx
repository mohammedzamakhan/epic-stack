import * as Sentry from '@sentry/react-router'

export function init() {
	Sentry.init({
		dsn: ENV.SENTRY_DSN,
		environment: ENV.MODE,
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

		// Performance monitoring: 10% in production, 100% in development
		// Reduced from 100% to significantly improve page load performance
		// Note: Sentry's beforeSend hook can be used to filter out non-critical
		// transactions if more granular control is needed in the future
		tracesSampleRate: ENV.MODE === 'production' ? 0.1 : 1.0,

		// Capture Replay for 5% of all sessions in production,
		// plus for 100% of sessions with an error
		replaysSessionSampleRate: ENV.MODE === 'production' ? 0.05 : 0.1,
		replaysOnErrorSampleRate: 1.0,
	})
}
