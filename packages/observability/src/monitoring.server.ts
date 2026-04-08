import { PrismaInstrumentation } from '@prisma/instrumentation'
import * as Sentry from '@sentry/react-router'

export function init() {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		environment: process.env.NODE_ENV,
		denyUrls: [
			/\/resources\/healthcheck/,
			/^(?:https?:\/\/[^/]+)?\/build\//,
			/^(?:https?:\/\/[^/]+)?\/favicons\//,
			/^(?:https?:\/\/[^/]+)?\/img\//,
			/^(?:https?:\/\/[^/]+)?\/images\//,
			/^(?:https?:\/\/[^/]+)?\/fonts\//,
			/^(?:https?:\/\/[^/]+)?\/favicon\.ico/,
			/^(?:https?:\/\/[^/]+)?\/site\.webmanifest/,
		],
		integrations: [
			Sentry.prismaIntegration({
				prismaInstrumentation: new PrismaInstrumentation(),
			}),
			Sentry.httpIntegration(),
		],
		tracesSampler(samplingContext) {
			// ignore healthcheck transactions by other services (consul, etc.)
			if (samplingContext.request?.url?.includes('/resources/healthcheck')) {
				return 0
			}
			return process.env.NODE_ENV === 'production' ? 1 : 0
		},
		beforeSendTransaction(event) {
			// ignore all healthcheck related transactions
			//  note that name of header here is case-sensitive
			if (event.request?.headers?.['x-healthcheck'] === 'true') {
				return null
			}

			return event
		},
	})
}
