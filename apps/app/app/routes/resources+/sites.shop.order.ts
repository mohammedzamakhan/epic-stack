import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
	PUBLIC_SITE_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'
import { getPublicShopOrderStatus } from '#app/utils/shop.server.ts'

/**
 * Public order status after Stripe Checkout redirect or embedded payment.
 * Query: ?session_id=cs_... OR ?payment_intent=pi_... plus slug= or host=
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const sessionId = url.searchParams.get('session_id')
	const paymentIntentId = url.searchParams.get('payment_intent')
	const slug = url.searchParams.get('slug')
	const host = url.searchParams.get('host')

	if ((!sessionId && !paymentIntentId) || (!slug && !host)) {
		throw new Response('Not Found', { status: 404 })
	}

	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		PUBLIC_SITE_RATE_LIMIT,
	)

	if (!rateLimitCheck.allowed) {
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	try {
		const order = await getPublicShopOrderStatus({
			slug,
			host,
			sessionId,
			paymentIntentId,
		})
		return Response.json(order, {
			headers: { 'Cache-Control': 'no-store' },
		})
	} catch (error) {
		if (error instanceof Response) throw error
		throw new Response('Not Found', { status: 404 })
	}
}
