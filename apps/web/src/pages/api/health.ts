import { createHealthResponse } from '@repo/common/health'

export const prerender = false

/**
 * Public liveness check for uptime monitoring.
 * GET /api/health
 */
export function GET() {
	return createHealthResponse('web')
}
