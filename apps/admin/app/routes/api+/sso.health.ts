import { requireUserWithRole } from '@repo/auth'
import { logger } from '@repo/observability'
import { type LoaderFunctionArgs } from 'react-router'
import { ssoHealthChecker } from '../../utils/sso-health-check.server.ts'

/**
 * SSO system health check endpoint for admin app
 * GET /api/sso/health
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

		// For other errors, log details server-side and return generic message
		logger.error({ err: error }, 'SSO health check failed')
		return Response.json(
			{
				overall: 'unhealthy',
				timestamp: new Date().toISOString(),
				error: 'Health check failed',
				message: 'An internal error occurred. Please check server logs.',
			},
			{ status: 500 },
		)
	}
}

/**
 * Validate specific SSO configuration
 * POST /api/sso/health
 */
export async function action({ request }: LoaderFunctionArgs) {
	try {
		await requireUserWithRole(request, 'admin')

		const formData = await request.formData()
		const configurationId = formData.get('configurationId') as string

		if (!configurationId) {
			return Response.json(
				{ error: 'Configuration ID is required' },
				{ status: 400 },
			)
		}

		const validationResult =
			await ssoHealthChecker.validateConfiguration(configurationId)

		return Response.json(validationResult, {
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Content-Type': 'application/json',
			},
		})
	} catch (error) {
		if (error instanceof Response && error.status === 403) {
			return Response.json(
				{
					error: 'Forbidden',
					message: 'Admin access required for configuration validation',
				},
				{ status: 403 },
			)
		}

		// Log details server-side and return generic message
		logger.error({ err: error }, 'SSO configuration validation failed')
		return Response.json(
			{
				error: 'Configuration validation failed',
				message: 'An internal error occurred. Please check server logs.',
			},
			{ status: 500 },
		)
	}
}
