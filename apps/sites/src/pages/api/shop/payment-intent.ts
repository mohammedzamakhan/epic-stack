export const prerender = false

import { createShopPaymentIntent } from '~/lib/org'

export async function POST({ request }: { request: Request }) {
	let body: {
		slug?: string
		host?: string
	}

	try {
		body = await request.json()
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	if (!body.slug && !body.host) {
		return new Response(JSON.stringify({ error: 'slug or host is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const result = await createShopPaymentIntent(
		body,
		request.headers.get('Authorization'),
	)

	if (!result?.clientSecret || !result.publishableKey) {
		return new Response(
			JSON.stringify({ error: result?.error || 'Payment setup failed' }),
			{
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}

	return new Response(
		JSON.stringify({
			clientSecret: result.clientSecret,
			publishableKey: result.publishableKey,
			paymentIntentId: result.paymentIntentId,
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
			},
		},
	)
}
