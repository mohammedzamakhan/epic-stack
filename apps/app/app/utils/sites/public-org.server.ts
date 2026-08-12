import {
	negotiateSiteLocale,
	parseLocalizedString,
	parseSiteLocalesConfig,
	pickLocalized,
	type SiteContentLocale,
	type SiteLocalesConfig,
} from '@repo/common/site-locales'
import {
	buildSiteThemeCss,
	parseSiteThemeConfig,
	type SiteThemeConfig,
} from '@repo/common/site-theme'
import { prisma } from '@repo/database'

export type PublicSiteAnnouncement = {
	id: string
	content: string
	type: 'info' | 'warning' | 'error' | 'success'
	linkUrl: string | null
	linkLabel: string | null
	linkNewTab: boolean
}

export type PublicSiteOrganization = {
	name: string
	slug: string
	customDomain: string | null
	siteTheme: string | null
	siteLocales: string | null
	siteDefaultLocale: string | null
	siteIconKey: string | null
	announcements: Array<{
		id: string
		content: string
		type: string
		linkUrl: string | null
		linkLabel: string | null
		linkNewTab: boolean
	}>
}

export type PublicSitePayload = {
	name: string
	slug: string
	customDomain: string | null
	theme: SiteThemeConfig & { css: string }
	locales: SiteContentLocale[]
	defaultLocale: SiteContentLocale
	locale: SiteContentLocale
	siteIcon: {
		favicon32: string
		favicon16: string
		appleTouchIcon: string
		original: string
	} | null
	announcements: PublicSiteAnnouncement[]
}

const ANNOUNCEMENT_TYPES = ['info', 'warning', 'error', 'success'] as const

function toPublicAnnouncement(
	announcement: PublicSiteOrganization['announcements'][number],
	locale: string,
	defaultLocale: string,
): PublicSiteAnnouncement | null {
	const type = ANNOUNCEMENT_TYPES.includes(
		announcement.type as (typeof ANNOUNCEMENT_TYPES)[number],
	)
		? (announcement.type as PublicSiteAnnouncement['type'])
		: 'info'

	const content = pickLocalized(
		parseLocalizedString(announcement.content, defaultLocale),
		locale,
		defaultLocale,
	)

	if (!content) return null

	const linkLabel = announcement.linkLabel
		? pickLocalized(
				parseLocalizedString(announcement.linkLabel, defaultLocale),
				locale,
				defaultLocale,
			) || null
		: null

	return {
		id: announcement.id,
		content,
		type,
		linkUrl: announcement.linkUrl,
		linkLabel,
		linkNewTab: announcement.linkNewTab,
	}
}

export function toPublicSitePayload(
	organization: PublicSiteOrganization,
	options?: {
		preferredLocale?: string | string[] | null
	},
): PublicSitePayload {
	const theme = parseSiteThemeConfig(organization.siteTheme)
	const localesConfig: SiteLocalesConfig = parseSiteLocalesConfig(
		organization.siteLocales,
		organization.siteDefaultLocale,
	)
	const locale = negotiateSiteLocale(
		options?.preferredLocale,
		localesConfig.locales,
		localesConfig.defaultLocale,
	)

	return {
		name: organization.name,
		slug: organization.slug,
		customDomain: organization.customDomain,
		theme: {
			...theme,
			css: buildSiteThemeCss(theme),
		},
		locales: localesConfig.locales,
		defaultLocale: localesConfig.defaultLocale,
		locale,
		siteIcon: organization.siteIconKey
			? {
					original: `/resources/images?objectKey=${encodeURIComponent(organization.siteIconKey)}`,
					favicon32: `/resources/images?objectKey=${encodeURIComponent(`org/${organization.slug}/site-icon/favicon-32.png`)}`,
					favicon16: `/resources/images?objectKey=${encodeURIComponent(`org/${organization.slug}/site-icon/favicon-16.png`)}`,
					appleTouchIcon: `/resources/images?objectKey=${encodeURIComponent(`org/${organization.slug}/site-icon/apple-touch-icon.png`)}`,
				}
			: null,
		announcements: organization.announcements
			.map((announcement) =>
				toPublicAnnouncement(announcement, locale, localesConfig.defaultLocale),
			)
			.filter((item): item is PublicSiteAnnouncement => item !== null),
	}
}

/**
 * Resolve a published org site by slug or custom domain host.
 */
export async function findPublishedSiteOrganization(options: {
	slug?: string | null
	host?: string | null
}): Promise<PublicSiteOrganization | null> {
	const slug = options.slug?.trim().toLowerCase() || null
	const host = options.host?.trim().toLowerCase().split(':')[0] || null

	if (!slug && !host) return null

	const select = {
		name: true,
		slug: true,
		customDomain: true,
		siteTheme: true,
		siteLocales: true,
		siteDefaultLocale: true,
		siteIconKey: true,
		announcements: {
			where: { isEnabled: true },
			orderBy: [{ position: 'asc' as const }, { createdAt: 'desc' as const }],
			select: {
				id: true,
				content: true,
				type: true,
				linkUrl: true,
				linkLabel: true,
				linkNewTab: true,
			},
		},
	}

	if (slug) {
		return prisma.organization.findFirst({
			where: {
				slug,
				active: true,
				sitePublished: true,
			},
			select,
		})
	}

	return prisma.organization.findFirst({
		where: {
			customDomain: host,
			active: true,
			sitePublished: true,
			customDomainStatus: { in: ['active', 'pending'] },
		},
		select,
	})
}
