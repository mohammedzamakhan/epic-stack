// import { getUptimeStatus } from '@repo/observability'
// import { type APIRoute } from 'astro'

// /**
//  * Status endpoint that returns uptime monitoring information
//  * GET /api/status
//  *
//  * This endpoint fetches the current status from BetterStack
//  * and returns it to the client for display.
//  */
// export const GET: APIRoute = async ({ request: _request }) => {
// 	const apiKey = import.meta.env.BETTERSTACK_API_KEY
// 	const statusPageUrl = import.meta.env.BETTERSTACK_URL

// 	if (!apiKey) {
// 		return new Response(
// 			JSON.stringify({
// 				status: 'degraded',
// 				message: 'Status monitoring not configured',
// 				upMonitors: 0,
// 				totalMonitors: 0,
// 			}),
// 			{
// 				status: 200,
// 				headers: {
// 					'Content-Type': 'application/json',
// 					'Cache-Control': 'public, max-age=60',
// 				},
// 			},
// 		)
// 	}

// 	const status = await getUptimeStatus(apiKey, statusPageUrl)

// 	return new Response(JSON.stringify(status), {
// 		status: 200,
// 		headers: {
// 			'Content-Type': 'application/json',
// 			'Cache-Control': 'public, max-age=60',
// 		},
// 	})
// }
