export { Status } from './src/status.js'
export { getUptimeStatus } from './src/betterstack-client.js'
export type {
	StatusInfo,
	StatusType,
	Monitor,
	MonitorsResponse,
} from './src/types.js'
export { init as initMonitoring } from './src/monitoring.server.js'
export {
	logger,
	sentryLogger,
	createSentryLogger,
	createChildLogger,
	sanitizeUrl,
	sanitizeIpAddress,
	getClientIp,
} from './src/logger.server.js'

// Wide Event logging exports
export {
	wideEventMiddleware,
	addUserContext,
	addErrorContext,
	type WideEventMiddlewareOptions,
} from './src/wide-event.js'
export {
	getRequestContext,
	getWideEvent,
	addWideEventContext,
	runWithRequestContext,
	generateRequestId,
	WideEventBuilder,
	type RequestContext,
} from './src/request-context.js'
