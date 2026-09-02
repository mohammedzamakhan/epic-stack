import { createHealthResponse } from '@repo/common/health'
import { type LoaderFunctionArgs } from 'react-router'

/**
 * Public health check endpoint for uptime monitoring
 * GET /api/health
 *
 * Deep checks (D1, self-reachability) live at `/resources/healthcheck`.
 */
export async function loader({ request: _request }: LoaderFunctionArgs) {
	return createHealthResponse('admin')
}
