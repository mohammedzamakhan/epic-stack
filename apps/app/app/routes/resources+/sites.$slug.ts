import { getClientLocales } from '@repo/i18n/server'
import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
	PUBLIC_SITE_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'
import {
	findPublishedSiteOrganization,
	toPublicSitePayload,
} from '#app/utils/sites/public-org.server.ts'

/**
 * Public endpoint for org Sites pages by slug.
 * Prefer /resources/sites?slug=… for new callers; this path remains for compatibility.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
	const slug = params.slug
	if (!slug) {
		throw new Response('Not Found', { status: 404 })
	}

	const url = new URL(request.url)
	const lng = url.searchParams.get('lng')

	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		PUBLIC_SITE_RATE_LIMIT,
	)

	if (!rateLimitCheck.allowed) {
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	const organization = await findPublishedSiteOrganization({ slug })

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const acceptLocales = getClientLocales(request)
	const preferredLocale = lng
		? [
				lng,
				...(Array.isArray(acceptLocales)
					? acceptLocales
					: acceptLocales
						? [acceptLocales]
						: []),
			]
		: acceptLocales

	return Response.json(toPublicSitePayload(organization, { preferredLocale }), {
		headers: {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			Vary: 'Accept-Language',
		},
	})
}
