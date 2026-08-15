import { type SiteFontSelection } from '@repo/common/site-fonts'
import { ENV } from 'varlock/env'

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
	name: string
	slug: string
	customDomain?: string | null
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
	return (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '')
}

async function fetchPublicOrganization(
	params: URLSearchParams,
): Promise<PublicOrganization | null> {
	const url = `${getAppUrl()}/resources/sites?${params.toString()}`

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
		})

		if (!response.ok) {
			return null
		}

		const data = (await response.json()) as PublicOrganization
		if (!data?.name || !data?.slug) {
			return null
		}

		return data
	} catch {
		return null
	}
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

	const url = `${getAppUrl()}/resources/sites/page?${params.toString()}`

	try {
		const response = await fetch(url, {
			headers: { Accept: 'application/json' },
		})
		if (!response.ok) return null
		return (await response.json()) as PublicWebsitePage
	} catch {
		return null
	}
}
