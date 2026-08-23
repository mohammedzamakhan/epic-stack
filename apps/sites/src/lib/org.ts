import { type SiteFontSelection } from '@repo/common/site-fonts'
import { ENV } from 'varlock/env'
import { edgeCache } from '~/lib/site-headers'

export type PublicSiteCustomFont = {
	url: string
	format: 'woff2' | 'woff' | 'truetype' | 'opentype'
}

export type PublicSiteTheme = {
	baseColor: string
	theme: string
	radius: string
	mode: 'light' | 'dark' | 'system'
	headingFont?: SiteFontSelection
	bodyFont?: SiteFontSelection
	headingCustomFont?: PublicSiteCustomFont | null
	bodyCustomFont?: PublicSiteCustomFont | null
	css: string
}

export type PublicSiteAnnouncement = {
	id: string
	content: string
	type: 'info' | 'warning' | 'error' | 'success'
	linkUrl: string | null
	linkLabel: string | null
	linkNewTab: boolean
}

export type PublicOrganization = {
	id: string
	name: string
	slug: string
	customDomain?: string | null
	dataRegion?: string | null
	theme?: PublicSiteTheme
	locales?: string[]
	defaultLocale?: string
	locale?: string
	siteIcon?: {
		original: string
		favicon32: string
		favicon16: string
		appleTouchIcon: string
	} | null
	announcements?: PublicSiteAnnouncement[]
}

function getAppUrl(): string {
	return (
		process.env.PUBLIC_APP_URL ||
		ENV.PUBLIC_APP_URL ||
		'http://localhost:3001'
	).replace(/\/$/, '')
}

async function fetchAppJson<T>(
	url: string,
	useCache = true,
): Promise<T | null> {
	const cache = useCache ? edgeCache() : null
	const cacheRequest = new Request(url, { method: 'GET' })
	if (cache) {
		const cached = await cache.match(cacheRequest)
		if (cached?.ok) {
			try {
				return (await cached.json()) as T
			} catch {
				/* fall through to network */
			}
		}
	}

	try {
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(6_000),
		})
		if (!response.ok) return null
		const data = (await response.json()) as T
		if (cache) {
			void cache.put(
				cacheRequest,
				new Response(JSON.stringify(data), {
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'max-age=60',
					},
				}),
			)
		}
		return data
	} catch {
		return null
	}
}

async function fetchPublicOrganization(
	params: URLSearchParams,
): Promise<PublicOrganization | null> {
	const data = await fetchAppJson<PublicOrganization>(
		`${getAppUrl()}/resources/sites?${params.toString()}`,
	)
	if (!data?.name || !data?.slug) {
		return null
	}
	return data
}

export async function fetchPublishedOrganizationForHost(
	orgSlug: string | null,
	customHost: string | null,
	locale?: string | null,
): Promise<PublicOrganization | null> {
	if (orgSlug) return fetchPublishedOrganization(orgSlug, locale)
	if (customHost) return fetchPublishedOrganizationByHost(customHost, locale)
	return null
}

/**
 * Fetch a published organization by slug from the main app public API.
 */
export async function fetchPublishedOrganization(
	slug: string,
	locale?: string | null,
): Promise<PublicOrganization | null> {
	const params = new URLSearchParams({ slug })
	if (locale) params.set('lng', locale)
	return fetchPublicOrganization(params)
}

/**
 * Fetch a published organization by custom domain host.
 */
export async function fetchPublishedOrganizationByHost(
	host: string,
	locale?: string | null,
): Promise<PublicOrganization | null> {
	const params = new URLSearchParams({ host })
	if (locale) params.set('lng', locale)
	return fetchPublicOrganization(params)
}

export type PublicWebsitePageSection = {
	id: string
	type: string
	position: number
	config: any
}

export type PublicWebsitePage = {
	id: string
	title: string
	slug: string
	isHomePage: boolean
	seo?: {
		title: string
		description: string
		imageUrl: string | null
		noIndex: boolean
	}
	sections: PublicWebsitePageSection[]
}

export async function fetchPublishedSitePage(options: {
	slug?: string | null
	host?: string | null
	pageSlug?: string
	home?: boolean
	preview?: boolean
	lng?: string | null
}): Promise<PublicWebsitePage | null> {
	const params = new URLSearchParams()
	if (options.slug) params.set('slug', options.slug)
	if (options.host) params.set('host', options.host)
	if (options.home) params.set('home', 'true')
	if (options.pageSlug) params.set('page', options.pageSlug)
	if (options.preview) params.set('preview', 'true')
	if (options.lng) params.set('lng', options.lng)

	return fetchAppJson<PublicWebsitePage>(
		`${getAppUrl()}/resources/sites/page?${params.toString()}`,
		!options.preview,
	)
}
