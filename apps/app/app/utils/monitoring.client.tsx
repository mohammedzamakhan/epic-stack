import { initClientMonitoring } from '@repo/observability'

export function init() {
	initClientMonitoring({
		dsn: ENV.SENTRY_DSN,
		environment: ENV.MODE,
	})
}
