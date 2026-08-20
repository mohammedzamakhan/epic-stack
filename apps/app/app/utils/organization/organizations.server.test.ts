import { auditService, AuditAction } from '@repo/audit'
import { db } from '@repo/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	HOME_PAGE_SLUG,
	HOME_PAGE_TITLE,
} from '#app/utils/website/home-page.ts'
import { createOrganization } from './organizations.server.ts'

type CreatedHomePageSection = {
	type: string
	position: number
	config: string
}

vi.mock('@repo/audit', () => ({
	AuditAction: {
		ORG_CREATED: 'ORG_CREATED',
	},
	auditService: {
		log: vi.fn(),
	},
}))

vi.mock('@repo/auth', () => ({
	getUserId: vi.fn(),
}))

vi.mock('@repo/database', () => {
	const db = {
		organizationRole: {
			findUnique: vi.fn(),
		},
		organization: {
			create: vi.fn(),
		},
		userOrganization: {
			updateMany: vi.fn(),
		},
		websitePage: {
			create: vi.fn(),
		},
		$transaction: vi.fn((fn: any) => fn(db)),
	}

	return { db }
})

describe('createOrganization', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(db.organizationRole.findUnique).mockResolvedValue({
			id: 'role-admin',
		} as any)
		vi.mocked(db.organization.create).mockResolvedValue({
			id: 'org-1',
			name: 'Acme',
			slug: 'acme',
			image: null,
		} as any)
		vi.mocked(db.userOrganization.updateMany).mockResolvedValue({
			count: 0,
		} as any)
		vi.mocked(db.websitePage.create).mockResolvedValue({
			id: 'page-1',
		} as any)
		vi.mocked(auditService.log).mockResolvedValue(undefined as any)
	})

	it('creates a published protected home page for new organizations', async () => {
		await createOrganization({
			name: 'Acme',
			slug: 'acme',
			description: 'Custom storefronts',
			userId: 'user-1',
		})

		const organizationCreate = vi.mocked(db.organization.create).mock
			.calls[0]![0]
		const organizationData = organizationCreate.data as {
			siteHeaderConfig: string
			siteFooterConfig: string
		}
		expect(JSON.parse(organizationData.siteHeaderConfig)).toEqual(
			expect.objectContaining({
				navLinks: [],
				ctaLabel: 'Get started',
				ctaUrl: '/login',
			}),
		)
		expect(JSON.parse(organizationData.siteFooterConfig)).toEqual(
			expect.objectContaining({
				columns: [
					{
						title: 'Explore',
						links: [{ label: 'Home', url: '/' }],
					},
				],
				ctaLabel: 'Get started',
				ctaUrl: '/login',
			}),
		)

		expect(db.websitePage.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				organizationId: 'org-1',
				title: HOME_PAGE_TITLE,
				slug: HOME_PAGE_SLUG,
				status: 'published',
				template: 'blank',
				isHomePage: true,
				position: 0,
				createdById: 'user-1',
			}),
		})

		const pageCreate = vi.mocked(db.websitePage.create).mock.calls[0]![0]
		const pageData = pageCreate.data as {
			sections: { create: CreatedHomePageSection[] }
		}
		const sections = pageData.sections.create
		expect(sections.map((section) => section.type)).toEqual([
			'hero',
			'features',
			'content',
			'cards',
			'testimonials',
			'faq',
			'cta',
		])

		const heroSection = sections[0]!
		expect(heroSection).toEqual(
			expect.objectContaining({
				type: 'hero',
				position: 0,
			}),
		)
		expect(JSON.parse(heroSection.config)).toEqual(
			expect.objectContaining({
				heading: 'Welcome to Acme',
				subheading:
					'Custom storefronts. Discover a better way to connect, decide, and get started with Acme.',
			}),
		)

		const ctaSection = sections[6]!
		expect(JSON.parse(ctaSection.config)).toEqual(
			expect.objectContaining({
				heading: 'Ready to experience Acme?',
				primaryLabel: 'Get started',
				primaryUrl: '/login',
			}),
		)
	})

	it('does not create an organization without the admin role', async () => {
		vi.mocked(db.organizationRole.findUnique).mockResolvedValue(null)

		await expect(
			createOrganization({
				name: 'Acme',
				slug: 'acme',
				userId: 'user-1',
			}),
		).rejects.toThrow('Admin role not found')

		expect(db.organization.create).not.toHaveBeenCalled()
		expect(db.websitePage.create).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.ORG_CREATED }),
		)
	})
})
