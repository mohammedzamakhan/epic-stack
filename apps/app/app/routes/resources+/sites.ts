import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'
import { findPublishedSiteOrganization } from '#app/utils/sites/public-org.server.ts'

const PUBLIC_SITE_RATE_LIMIT = {
	maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100,
	windowMs: 60 * 1000, // 1 minute
}

/**
 * Public endpoint for org Sites pages.
 * Returns only non-sensitive fields for published, active organizations.
 *
 * Query: ?slug=acme  OR  ?host=www.acme.com
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const slug = url.searchParams.get('slug')
	const host = url.searchParams.get('host')

	if (!slug && !host) {
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

	const organization = await findPublishedSiteOrganization({ slug, host })

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	return Response.json(
		{
			name: organization.name,
			slug: organization.slug,
			customDomain: organization.customDomain,
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
			},
		},
	)
}
