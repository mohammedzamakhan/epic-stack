import { type User } from '@prisma/client'
import { prisma } from '@repo/prisma'

export type OrganizationWithImage = {
	id: string
	name: string
	slug: string
	image?: { id: string; altText?: string | null; objectKey: string } | null
	userCount?: number
}

export type UserOrganizationWithRole = {
	organization: OrganizationWithImage
	role: string
	isDefault: boolean
}

export async function getUserOrganizations(userId: User['id']) {
	const userOrganizations = await prisma.userOrganization.findMany({
		where: { userId, active: true },
		select: {
			role: true,
			isDefault: true,
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					image: {
						select: {
							id: true,
							altText: true,
							objectKey: true,
						},
					},
				},
			},
		},
	})

	return userOrganizations as UserOrganizationWithRole[]
}

export async function getUserDefaultOrganization(userId: User['id']) {
	const defaultOrg = await prisma.userOrganization.findFirst({
		where: { userId, isDefault: true, active: true },
		select: {
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					image: {
						select: {
							id: true,
							altText: true,
							objectKey: true,
						},
					},
					_count: {
						select: {
							users: {
								where: { active: true },
							},
						},
					},
				},
			},
			role: true,
			isDefault: true,
		},
	})

	if (!defaultOrg) {
		// If no default organization is set, get the first active organization
		const firstOrg = await prisma.userOrganization.findFirst({
			where: { userId, active: true },
			select: {
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
						image: {
							select: {
								id: true,
								altText: true,
								objectKey: true,
							},
						},
						_count: {
							select: {
								users: {
									where: { active: true },
								},
							},
						},
					},
				},
				role: true,
				isDefault: true,
			},
			orderBy: { createdAt: 'asc' },
		})

		if (firstOrg) {
			return {
				...firstOrg,
				organization: {
					...firstOrg.organization,
					userCount: firstOrg.organization._count.users,
				},
			} as UserOrganizationWithRole
		}
		return null
	}

	return {
		...defaultOrg,
		organization: {
			...defaultOrg.organization,
			userCount: defaultOrg.organization._count.users,
		},
	} as UserOrganizationWithRole
}

export async function setUserDefaultOrganization(
	userId: User['id'],
	organizationId: string,
) {
	// First reset all organizations to non-default
	await prisma.userOrganization.updateMany({
		where: { userId, isDefault: true },
		data: { isDefault: false },
	})

	// Set the selected organization as default
	await prisma.userOrganization.update({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
		},
		data: { isDefault: true },
	})

	return getUserDefaultOrganization(userId)
}

export async function createOrganization({
	name,
	slug,
	description,
	userId,
	imageObjectKey,
}: {
	name: string
	slug: string
	description?: string
	userId: string
	imageObjectKey?: string
}) {
	return prisma.$transaction(async (tx) => {
		const organization = await tx.organization.create({
			data: {
				name,
				slug,
				description,
				users: {
					create: {
						userId,
						role: 'admin',
						isDefault: true,
					},
				},
				...(imageObjectKey
					? {
							image: {
								create: {
									altText: `${name} logo`,
									objectKey: imageObjectKey,
								},
							},
						}
					: {}),
			},
			select: {
				id: true,
				name: true,
				slug: true,
				image: {
					select: {
						id: true,
						objectKey: true,
					},
				},
			},
		})

		// Set all other organizations as non-default
		await tx.userOrganization.updateMany({
			where: {
				userId,
				organizationId: { not: organization.id },
				isDefault: true,
			},
			data: { isDefault: false },
		})

		return organization
	})
}

export async function getOrganizationBySlug(slug: string) {
	return prisma.organization.findUnique({
		where: { slug, active: true },
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			image: {
				select: {
					id: true,
					altText: true,
				},
			},
		},
	})
}

export async function checkUserOrganizationAccess(
	userId: string,
	organizationId: string,
) {
	const userOrg = await prisma.userOrganization.findUnique({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
			active: true,
		},
	})

	return !!userOrg
}

/**
 * Check if the user has access to the specified organization
 * Throws a 403 Response if user doesn't have access
 */
export async function userHasOrgAccess(
	request: Request,
	organizationId: string,
): Promise<boolean> {
	const user = await prisma.user.findFirst({
		where: {
			sessions: {
				some: {
					expirationDate: { gt: new Date() },
				},
			},
		},
		select: { id: true },
	})

	if (!user) {
		throw new Response('Unauthorized', { status: 401 })
	}

	// Check if user is a member of this organization
	const userOrg = await prisma.userOrganization.findFirst({
		where: {
			userId: user.id,
			organizationId,
			active: true,
		},
	})

	if (!userOrg) {
		throw new Response('You do not have access to this organization', {
			status: 403,
		})
	}

	return true
}
