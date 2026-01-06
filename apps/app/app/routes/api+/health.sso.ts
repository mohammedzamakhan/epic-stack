import { type LoaderFunctionArgs } from 'react-router'
import { requireUserWithRole } from '../../utils/permissions.server.ts'
import { ssoHealthChecker } from '../../utils/sso/health-check.server.ts'

/**
 * SSO system health check endpoint
 * GET /api/health/sso
 */
export async function loader({ request }: LoaderFunctionArgs) {
	try {
		// Only allow system administrators to access health checks
		await requireUserWithRole(request, 'admin')

		const healthStatus = await ssoHealthChecker.checkSystemHealth()

		// Set appropriate HTTP status based on health
		let status = 200
		if (healthStatus.overall === 'degraded') {
			status = 200 // Still OK, but with warnings
		} else if (healthStatus.overall === 'unhealthy') {
			status = 503 // Service Unavailable
		}

		return Response.json(healthStatus, {
			status,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		// If user doesn't have permission, return 403
		if (error instanceof Response && error.status === 403) {
			return Response.json(
				{
					error: 'Forbidden',
					message: 'Admin access required for health checks',
				},
				{ status: 403 },
			)
		}

		// For other errors, return 500
		return Response.json(
			{
				overall: 'unhealthy',
				timestamp: new Date().toISOString(),
				error: 'Health check failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 },
		)
	}
}
