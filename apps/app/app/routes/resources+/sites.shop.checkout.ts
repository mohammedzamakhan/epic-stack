import { getClientIp } from '@repo/security'
import { type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import {
	checkRateLimit,
	createRateLimitResponse,
	PUBLIC_SITE_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'
import { createPublicShopCheckoutSession } from '#app/utils/shop.server.ts'

const checkoutSchema = z.object({
	slug: z.string().optional(),
	host: z.string().optional(),
	customerId: z.string().optional(),
	customerEmail: z.string().email().optional().or(z.literal('')),
})

/**
 * Creates a Stripe Checkout session for a tenant site shop purchase.
 */
export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		PUBLIC_SITE_RATE_LIMIT,
	)

	if (!rateLimitCheck.allowed) {
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const parsed = checkoutSchema.safeParse(body)
	if (!parsed.success) {
		return Response.json({ error: 'Invalid request' }, { status: 400 })
	}

	if (!parsed.data.slug && !parsed.data.host) {
		return Response.json({ error: 'slug or host is required' }, { status: 400 })
	}

	try {
		const { session } = await createPublicShopCheckoutSession({
			request,
			slug: parsed.data.slug,
			host: parsed.data.host,
			customerId: parsed.data.customerId,
			customerEmail: parsed.data.customerEmail || null,
		})

		if (!session.url) {
			return Response.json(
				{ error: 'Unable to create checkout session' },
				{ status: 500 },
			)
		}

		return Response.json({ checkoutUrl: session.url, sessionId: session.id })
	} catch (error) {
		if (error instanceof Response) throw error
		console.error('Shop checkout error:', error)
		return Response.json({ error: 'Checkout failed' }, { status: 500 })
	}
}
