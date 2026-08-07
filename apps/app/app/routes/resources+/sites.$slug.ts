import { prisma } from '@repo/database'
import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'

const PUBLIC_SITE_RATE_LIMIT = {
	maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100,
	windowMs: 60 * 1000, // 1 minute
}

/**
 * Public endpoint for org Sites pages.
 * Returns only non-sensitive fields for published, active organizations.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
	const slug = params.slug
	if (!slug) {
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

	const organization = await prisma.organization.findFirst({
		where: {
			slug,
			active: true,
			sitePublished: true,
		},
		select: {
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	return Response.json(organization, {
		headers: {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
		},
	})
}
