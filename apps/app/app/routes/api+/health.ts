import { type LoaderFunctionArgs } from 'react-router'

/**
 * Public health check endpoint for uptime monitoring
 * GET /api/health
 *
 * This endpoint is used by BetterStack and other uptime monitoring services
 * to check if the application is running.
 */
export async function loader({ request }: LoaderFunctionArgs) {
	return Response.json(
		{
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'app',
		},
		{
			status: 200,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Content-Type': 'application/json',
			},
		},
	)
}
