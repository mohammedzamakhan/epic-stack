import { invariant } from '@epic-web/invariant'
import type { Prisma } from '@prisma/client'

import { prisma } from '#app/utils/db.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

/**
 * Load an organization by slug for the authenticated user.
 * Throws a 404 if the organization doesn't exist or user is not a member.
 *
 * @param request - The request object
 * @param orgSlug - The organization slug from route params
 * @param select - Prisma select object for which organization fields to return
 * @returns The organization with selected fields
 */
export async function requireUserOrganization<T extends Prisma.OrganizationSelect>(
	request: Request,
	orgSlug: string | undefined,
	select: T,
): Promise<Prisma.OrganizationGetPayload<{ select: T }>> {
	const userId = await requireUserId(request)
	invariant(orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: orgSlug,
			users: {
				some: {
					userId,
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
