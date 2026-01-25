import { type User } from '@prisma/client'
import { prisma } from '@repo/database'

type OrganizationWithImage = {
	id: string
	name: string
	slug: string
	image?: { id: string; altText?: string | null; objectKey: string } | null
	userCount?: number
}

type UserOrganizationWithRole = {
	organization: OrganizationWithImage
	organizationRole: {
		id: string
		name: string
		level: number
		permissions?: {
			action: string
			entity: string
			access: string
		}[]
	}
	isDefault: boolean
	// Keep for backward compatibility during transition
	role?: string
}

export async function getUserOrganizations(
	userId: User['id'],
	includePermissions: boolean = false,
) {
	const userOrganizations = await prisma.userOrganization.findMany({
		where: { userId, active: true },
		select: {
			organizationRole: {
				select: {
					id: true,
					name: true,
					level: true,
					permissions: includePermissions
						? {
								where: { context: 'organization' },
								select: {
									action: true,
									entity: true,
									access: true,
								},
							}
						: false,
				},
			},
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
			organizationRole: {
				select: {
					id: true,
					name: true,
					level: true,
				},
			},
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
				organizationRole: {
					select: {
						id: true,
						name: true,
						level: true,
					},
				},
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
