import { prisma } from '@repo/database'

export type PublicSiteOrganization = {
	name: string
	slug: string
	customDomain: string | null
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

	if (slug) {
		return prisma.organization.findFirst({
			where: {
				slug,
				active: true,
				sitePublished: true,
			},
			select: {
				name: true,
				slug: true,
				customDomain: true,
			},
		})
	}

	return prisma.organization.findFirst({
		where: {
			customDomain: host,
			active: true,
			sitePublished: true,
			customDomainStatus: { in: ['active', 'pending'] },
		},
		select: {
			name: true,
			slug: true,
			customDomain: true,
		},
	})
}
