export const prerender = false

import { createShopCheckoutSession } from '~/lib/org'

export async function POST({ request }: { request: Request }) {
	let body: {
		slug?: string
		host?: string
		embed?: boolean
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

	const result = await createShopCheckoutSession(
		body,
		request.headers.get('Authorization'),
	)

	if (!result?.checkoutUrl) {
		return new Response(
			JSON.stringify({ error: result?.error || 'Checkout failed' }),
			{
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}

	return new Response(
		JSON.stringify({
			checkoutUrl: result.checkoutUrl,
			sessionId: result.sessionId,
			processor: result.processor,
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
