import {
	and,
	db,
	eq,
	inArray,
	Organization,
	WebsitePage,
	WebsitePageSection,
} from '@repo/database'
import { getDefaultConfig } from './block-types.ts'

/**
 * Guarantee the organization has site-wide header and footer config.
 * Existing per-page chrome is copied once, then removed so every page shares
 * the same header and footer.
 */
export async function ensureSiteChrome(organizationId: string) {
	const [organization] = await db
		.select({
			siteHeaderConfig: Organization.siteHeaderConfig,
			siteFooterConfig: Organization.siteFooterConfig,
		})
		.from(Organization)
		.where(eq(Organization.id, organizationId))
		.limit(1)
	if (!organization) return

	let headerConfig = organization.siteHeaderConfig
	let footerConfig = organization.siteFooterConfig

	if (!headerConfig || !footerConfig) {
		const pages = await db
			.select({ id: WebsitePage.id })
			.from(WebsitePage)
			.where(eq(WebsitePage.organizationId, organizationId))
			.orderBy(WebsitePage.isHomePage, WebsitePage.position)
		const pageIds = pages.map((page) => page.id)
		const sections =
			pageIds.length > 0
				? await db
						.select({
							type: WebsitePageSection.type,
							config: WebsitePageSection.config,
						})
						.from(WebsitePageSection)
						.where(
							and(
								inArray(WebsitePageSection.pageId, pageIds),
								inArray(WebsitePageSection.type, ['header', 'footer']),
							),
						)
						.orderBy(WebsitePageSection.createdAt)
				: []
		for (const section of sections) {
			if (section.type === 'header' && !headerConfig) {
				headerConfig = section.config
			}
			if (section.type === 'footer' && !footerConfig) {
				footerConfig = section.config
			}
		}
	}

	const nextHeader = headerConfig ?? JSON.stringify(getDefaultConfig('header'))
	const nextFooter = footerConfig ?? JSON.stringify(getDefaultConfig('footer'))

	if (
		organization.siteHeaderConfig !== nextHeader ||
		organization.siteFooterConfig !== nextFooter
	) {
		await db
			.update(Organization)
			.set({
				siteHeaderConfig: nextHeader,
				siteFooterConfig: nextFooter,
			})
			.where(eq(Organization.id, organizationId))
	}

	const pages = await db
		.select({ id: WebsitePage.id })
		.from(WebsitePage)
		.where(eq(WebsitePage.organizationId, organizationId))
	const pageIds = pages.map((page) => page.id)
	if (pageIds.length > 0) {
		await db
			.delete(WebsitePageSection)
			.where(
				and(
					inArray(WebsitePageSection.pageId, pageIds),
					inArray(WebsitePageSection.type, ['header', 'footer']),
				),
			)
	}
}
