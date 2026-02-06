import type { APIRoute } from 'astro'
import {
	buildAcceptAllCookie,
	buildRejectAllCookie,
	buildConsentSetCookie,
} from '~/utils/cookie-consent'

/**
 * POST /api/cookie-consent
 *
 * Accepts a JSON body with:
 *   { intent: 'accept-all' | 'reject-all' | 'save-preferences', analytics?: boolean, marketing?: boolean, preferences?: boolean }
 *
 * Returns a Set-Cookie header to persist the consent.
 */
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json()
		const { intent } = body

		let cookie: string

		if (intent === 'accept-all') {
			cookie = buildAcceptAllCookie()
		} else if (intent === 'reject-all') {
			cookie = buildRejectAllCookie()
		} else if (intent === 'save-preferences') {
			cookie = buildConsentSetCookie({
				analytics: body.analytics === true,
				marketing: body.marketing === true,
				preferences: body.preferences === true,
			})
		} else {
			return new Response(
				JSON.stringify({ success: false, error: 'Invalid intent' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			)
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': cookie,
			},
		})
	} catch {
		return new Response(
			JSON.stringify({ success: false, error: 'Bad request' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			},
		)
	}
}
