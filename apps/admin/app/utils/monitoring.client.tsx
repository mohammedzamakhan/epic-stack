import { initClientMonitoring } from '@repo/observability/client'
import { ENV } from 'varlock/env'

export function init() {
	initClientMonitoring({
		dsn: ENV.SENTRY_DSN as string,
		environment: ENV.NODE_ENV,
	})
}
