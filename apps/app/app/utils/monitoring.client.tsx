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

		// Performance monitoring with intelligent sampling:
		// - Always capture security-critical transactions (auth, security routes)
		// - 10% sampling for other transactions in production
		// - 100% in development for debugging
		tracesSampleRate:
			ENV.MODE === 'production'
				? (samplingContext) => {
						const transactionName = samplingContext.transactionContext?.name || ''
						const url = samplingContext.location?.pathname || ''

						// Always capture security-critical transactions
						if (
							transactionName.includes('auth') ||
							transactionName.includes('security') ||
							transactionName.includes('login') ||
							transactionName.includes('signup') ||
							url.includes('/security') ||
							url.includes('/login') ||
							url.includes('/signup')
						) {
							return 1.0
						}

						// 10% sampling for everything else
						return 0.1
					}
				: 1.0,

		// Capture Replay for 5% of all sessions in production,
		// plus for 100% of sessions with an error
		replaysSessionSampleRate: ENV.MODE === 'production' ? 0.05 : 0.1,
		replaysOnErrorSampleRate: 1.0,
	})
}
