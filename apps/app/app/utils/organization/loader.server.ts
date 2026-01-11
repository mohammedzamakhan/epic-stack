import { invariant } from '@epic-web/invariant'
import { type Prisma } from '@prisma/client'

import { prisma } from '@repo/database'
import { requireUserId } from '#app/utils/auth.server.ts'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

/**
 * Load an organization by slug for the authenticated user.
 * Throws a 404 if the organization doesn't exist or user is not a member.
 *
 * @param request - The request object
 * @param orgSlug - The organization slug from route params
 * @param select - Prisma select object for which organization fields to return
 * @returns The organization with selected fields
 */
export async function requireUserOrganization<
	T extends Prisma.OrganizationSelect,
>(
	request: Request,
	orgSlug: string | undefined,
	select: T,
): Promise<Prisma.OrganizationGetPayload<{ select: T }>> {
	const userId = await requireUserId(request)
	invariant(orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: orgSlug,
			active: true,
			users: {
				some: {
					userId,
					active: true,
				},
			},
		},
		select,
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	return organization
}

/**
 * Validates organization exists and user has access to it.
 * Common helper for API routes that need organization validation.
 * Throws Response with appropriate status codes if validation fails.
 *
 * @param request - The request object
 * @param orgSlug - The organization slug from route params
 * @returns The organization with id
 */
export async function validateOrgAccess(
	request: Request,
	orgSlug: string | undefined,
): Promise<{ id: string }> {
	if (!orgSlug) {
		throw new Response('Missing orgSlug', { status: 400 })
	}

	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug, active: true },
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	await userHasOrgAccess(request, organization.id)

	return organization
}
