import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
	PUBLIC_SITE_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'
import {
	findPublishedShopOrganization,
	getPublicShopProduct,
} from '#app/utils/shop.server.ts'

/**
 * Public shop product for published tenant sites (US only).
 * Query: ?slug=acme OR ?host=www.acme.com
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

	const organization = await findPublishedShopOrganization({ slug, host })

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const product = getPublicShopProduct(organization)

	if (!product) {
		return Response.json({ available: false as const }, { status: 404 })
	}

	return Response.json(
		{
			available: true as const,
			organization: {
				name: organization.name,
				slug: organization.slug,
			},
			product,
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
			},
		},
	)
}
