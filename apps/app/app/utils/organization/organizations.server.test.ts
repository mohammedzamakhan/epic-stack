import { auditService, AuditAction } from '@repo/audit'
import { prisma } from '@repo/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	HOME_PAGE_SLUG,
	HOME_PAGE_TITLE,
} from '#app/utils/website/home-page.ts'
import { createOrganization } from './organizations.server.ts'

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
	const prisma = {
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
		$transaction: vi.fn((fn: any) => fn(prisma)),
	}

	return { prisma }
})

describe('createOrganization', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.organizationRole.findUnique).mockResolvedValue({
			id: 'role-admin',
		} as any)
		vi.mocked(prisma.organization.create).mockResolvedValue({
			id: 'org-1',
			name: 'Acme',
			slug: 'acme',
			image: null,
		} as any)
		vi.mocked(prisma.userOrganization.updateMany).mockResolvedValue({
			count: 0,
		} as any)
		vi.mocked(prisma.websitePage.create).mockResolvedValue({
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

		expect(prisma.websitePage.create).toHaveBeenCalledWith({
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

		const pageCreate = vi.mocked(prisma.websitePage.create).mock.calls[0]![0]
		const sections = pageCreate.data.sections.create
		expect(sections.map((section: any) => section.type)).toEqual([
			'hero',
			'features',
			'content',
			'cards',
			'testimonials',
			'faq',
			'cta',
		])

		const heroSection = sections[0]
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

		const ctaSection = sections[6]
		expect(JSON.parse(ctaSection.config)).toEqual(
			expect.objectContaining({
				heading: 'Ready to experience Acme?',
				primaryLabel: 'Get started',
				primaryUrl: '/login',
			}),
		)
	})

	it('does not create an organization without the admin role', async () => {
		vi.mocked(prisma.organizationRole.findUnique).mockResolvedValue(null)

		await expect(
			createOrganization({
				name: 'Acme',
				slug: 'acme',
				userId: 'user-1',
			}),
		).rejects.toThrow('Admin role not found')

		expect(prisma.organization.create).not.toHaveBeenCalled()
		expect(prisma.websitePage.create).not.toHaveBeenCalled()
		expect(auditService.log).not.toHaveBeenCalledWith(
			expect.objectContaining({ action: AuditAction.ORG_CREATED }),
		)
	})
})
