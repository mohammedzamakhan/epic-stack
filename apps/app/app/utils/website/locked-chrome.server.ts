import { prisma } from '@repo/database'
import { getDefaultConfig } from './block-types.ts'

/**
 * Guarantee the organization has site-wide header and footer config.
 * Existing per-page chrome is copied once, then removed so every page shares
 * the same header and footer.
 */
export async function ensureSiteChrome(organizationId: string) {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { siteHeaderConfig: true, siteFooterConfig: true },
	})
	if (!organization) return

	let headerConfig = organization.siteHeaderConfig
	let footerConfig = organization.siteFooterConfig

	if (!headerConfig || !footerConfig) {
		const pages = await prisma.websitePage.findMany({
			where: { organizationId },
			orderBy: [{ isHomePage: 'desc' }, { position: 'asc' }],
			select: {
				sections: {
					where: { type: { in: ['header', 'footer'] } },
					orderBy: { createdAt: 'asc' },
					select: { type: true, config: true },
				},
			},
		})
		for (const page of pages) {
			for (const section of page.sections) {
				if (section.type === 'header' && !headerConfig) {
					headerConfig = section.config
				}
				if (section.type === 'footer' && !footerConfig) {
					footerConfig = section.config
				}
			}
		}
	}

	const nextHeader = headerConfig ?? JSON.stringify(getDefaultConfig('header'))
	const nextFooter = footerConfig ?? JSON.stringify(getDefaultConfig('footer'))

	if (
		organization.siteHeaderConfig !== nextHeader ||
		organization.siteFooterConfig !== nextFooter
	) {
		await prisma.organization.update({
			where: { id: organizationId },
			data: {
				siteHeaderConfig: nextHeader,
				siteFooterConfig: nextFooter,
			},
		})
	}

	await prisma.websitePageSection.deleteMany({
		where: {
			type: { in: ['header', 'footer'] },
			page: { organizationId },
		},
	})
}
