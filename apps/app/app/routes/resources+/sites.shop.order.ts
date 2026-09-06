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
	const checkoutId = url.searchParams.get('checkout_id')
	const checkoutPaymentId =
		url.searchParams.get('cko_payment_id') ||
		url.searchParams.get('cko-payment-id')
	const slug = url.searchParams.get('slug')
	const host = url.searchParams.get('host')

	if (
		(!sessionId && !paymentIntentId && !checkoutId && !checkoutPaymentId) ||
		(!slug && !host)
	) {
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
			checkoutId,
			checkoutPaymentId,
		})
		return Response.json(order, {
			headers: { 'Cache-Control': 'no-store' },
		})
	} catch (error) {
		if (error instanceof Response) throw error
		console.error('Unable to retrieve public shop order status:', error)
		throw new Response('Order status is temporarily unavailable', {
			status: 503,
		})
	}
}
