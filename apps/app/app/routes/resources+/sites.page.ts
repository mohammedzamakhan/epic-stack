import { and, db, eq, inArray, Organization } from '@repo/database'
import { getClientLocales } from '@repo/i18n/server'
import { getClientIp } from '@repo/security'
import { type LoaderFunctionArgs } from 'react-router'
import {
	checkRateLimit,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'
import {
	findPublishedSitePage,
	toPublicPagePayload,
} from '#app/utils/sites/public-org.server.ts'

const PUBLIC_SITE_RATE_LIMIT = {
	maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100,
	windowMs: 60 * 1000, // 1 minute
}

/**
 * Public endpoint for fetching an org Site's page.
 * Returns the page and its sections.
 *
 * Query: ?slug=acme&page=about  OR  ?host=www.acme.com&page=about
 * Landing page: ?slug=acme&home=true
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const slug = url.searchParams.get('slug')
	const host = url.searchParams.get('host')
	const pageSlug = url.searchParams.get('page')
	const wantHome = url.searchParams.get('home') === 'true'
	const lng = url.searchParams.get('lng')

	if ((!slug && !host) || (!pageSlug && !wantHome)) {
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

	// First find the organization to ensure it's published and active, and to get its ID
	let orgId = null
	let defaultLocale = 'en'
	let headerConfig: string | null = null
	let footerConfig: string | null = null
	if (slug) {
		const [org] = await db
			.select({
				id: Organization.id,
				siteDefaultLocale: Organization.siteDefaultLocale,
				siteHeaderConfig: Organization.siteHeaderConfig,
				siteFooterConfig: Organization.siteFooterConfig,
			})
			.from(Organization)
			.where(
				and(
					eq(Organization.slug, slug.trim().toLowerCase()),
					eq(Organization.active, true),
					eq(Organization.sitePublished, true),
				),
			)
			.limit(1)
		orgId = org?.id
		defaultLocale = org?.siteDefaultLocale ?? 'en'
		headerConfig = org?.siteHeaderConfig ?? null
		footerConfig = org?.siteFooterConfig ?? null
	} else if (host) {
		const [org] = await db
			.select({
				id: Organization.id,
				siteDefaultLocale: Organization.siteDefaultLocale,
				siteHeaderConfig: Organization.siteHeaderConfig,
				siteFooterConfig: Organization.siteFooterConfig,
			})
			.from(Organization)
			.where(
				and(
					eq(
						Organization.customDomain,
						host.trim().toLowerCase().split(':')[0]!,
					),
					eq(Organization.active, true),
					eq(Organization.sitePublished, true),
					inArray(Organization.customDomainStatus, ['active', 'pending']),
				),
			)
			.limit(1)
		orgId = org?.id
		defaultLocale = org?.siteDefaultLocale ?? 'en'
		headerConfig = org?.siteHeaderConfig ?? null
		footerConfig = org?.siteFooterConfig ?? null
	}

	if (!orgId) {
		throw new Response('Not Found', { status: 404 })
	}

	const isPreview = url.searchParams.get('preview') === 'true'

	// Then fetch the page
	const page = await findPublishedSitePage(orgId, pageSlug, {
		preview: isPreview,
		home: wantHome,
	})

	if (!page) {
		throw new Response('Not Found', { status: 404 })
	}

	const acceptLocales = getClientLocales(request)
	const preferredLocales = lng
		? [
				lng,
				...(Array.isArray(acceptLocales)
					? acceptLocales
					: acceptLocales
						? [acceptLocales]
						: []),
			]
		: acceptLocales

	// The `toPublicPagePayload` helper will use the first preferred locale
	const requestedLocale = Array.isArray(preferredLocales)
		? preferredLocales[0]
		: typeof preferredLocales === 'string'
			? preferredLocales
			: defaultLocale

	return Response.json(
		toPublicPagePayload(page, requestedLocale, defaultLocale, {
			headerConfig,
			footerConfig,
		}),
		{
			headers: {
				'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
				Vary: 'Accept-Language',
			},
		},
	)
}
