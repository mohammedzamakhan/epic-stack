import { initClientMonitoring } from '@repo/observability'

export function init() {
	initClientMonitoring({
		dsn: ENV.SENTRY_DSN,
		environment: ENV.MODE,
		// Admin app uses 100% sample rate for traces
		tracesSampleRate: 1.0,
		// Admin uses 0.1 for session replays
		replaysSessionSampleRate: 0.1,
	})
}
