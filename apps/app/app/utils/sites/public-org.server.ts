import {
	buildSiteThemeCss,
	parseSiteThemeConfig,
	type SiteThemeConfig,
} from '@repo/common/site-theme'
import { prisma } from '@repo/database'

export type PublicSiteOrganization = {
	name: string
	slug: string
	customDomain: string | null
	siteTheme: string | null
}

export type PublicSitePayload = {
	name: string
	slug: string
	customDomain: string | null
	theme: SiteThemeConfig & { css: string }
}

export function toPublicSitePayload(
	organization: PublicSiteOrganization,
): PublicSitePayload {
	const theme = parseSiteThemeConfig(organization.siteTheme)
	return {
		name: organization.name,
		slug: organization.slug,
		customDomain: organization.customDomain,
		theme: {
			...theme,
			css: buildSiteThemeCss(theme),
		},
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
	} as const

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
