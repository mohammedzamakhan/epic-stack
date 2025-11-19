import { initClientMonitoring } from '@repo/observability/client'

export function init() {
	initClientMonitoring({
		dsn: ENV.SENTRY_DSN as string,
		environment: ENV.MODE,
	})
}
