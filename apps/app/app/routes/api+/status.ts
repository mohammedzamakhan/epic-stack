import { type LoaderFunctionArgs } from 'react-router'
import { getUptimeStatus } from '@repo/observability'

/**
 * Status endpoint that returns uptime monitoring information
 * GET /api/status
 *
 * This endpoint fetches the current status from BetterStack
 * and returns it to the client for display.
 */
export async function loader({ request: _request }: LoaderFunctionArgs) {
	const apiKey = process.env.BETTERSTACK_API_KEY
	const statusPageUrl = process.env.BETTERSTACK_URL

	if (!apiKey) {
		return Response.json(
			{
				status: 'degraded',
				message: 'Status monitoring not configured',
				upMonitors: 0,
				totalMonitors: 0,
			},
			{
				status: 200,
				headers: {
					'Cache-Control': 'public, max-age=60',
					'Content-Type': 'application/json',
				},
			},
		)
	}

	const status = await getUptimeStatus(apiKey, statusPageUrl)

	return Response.json(status, {
		status: 200,
		headers: {
			'Cache-Control': 'public, max-age=60',
			'Content-Type': 'application/json',
		},
	})
}
