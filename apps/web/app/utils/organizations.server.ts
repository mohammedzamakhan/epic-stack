import { type User } from '@prisma/client'
import { data } from 'react-router'
import { prisma } from '@repo/prisma'
import { getUserId } from './auth.server.ts'

export type OrganizationWithImage = {
	id: string
	name: string
	slug: string
	image?: { id: string; altText?: string | null; objectKey: string } | null
	userCount?: number
}

export type UserOrganizationWithRole = {
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

export async function getUserOrganizations(userId: User['id'], includePermissions: boolean = false) {
	const userOrganizations = await prisma.userOrganization.findMany({
		where: { userId, active: true },
		select: {
			organizationRole: {
				select: {
					id: true,
					name: true,
					level: true,
					permissions: includePermissions ? {
						where: { context: 'organization' },
						select: {
							action: true,
							entity: true,
							access: true,
						},
					} : false,
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
		// Get the admin role first
		const adminRole = await tx.organizationRole.findUnique({
			where: { name: 'admin' },
			select: { id: true },
		})

		if (!adminRole) {
			throw new Error('Admin role not found')
		}

		const organization = await tx.organization.create({
			data: {
				name,
				slug,
				description,
				users: {
					create: {
						userId,
						organizationRoleId: adminRole.id,
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
		include: {
			organizationRole: true,
		},
	})

	return userOrg
}

// Role level constants for server-side use
export const ORGANIZATION_ROLE_LEVELS = {
	admin: 4,
	member: 3,
	viewer: 2,
	guest: 1,
} as const

export type OrganizationRoleName = keyof typeof ORGANIZATION_ROLE_LEVELS

/**
 * Check if user has minimum required role level in organization
 */
export async function userHasOrganizationRole(
	userId: string,
	organizationId: string,
	requiredRole: OrganizationRoleName,
): Promise<boolean> {
	const userOrg = await checkUserOrganizationAccess(userId, organizationId)
	if (!userOrg) return false

	const userRoleLevel = userOrg.organizationRole.level
	const requiredRoleLevel = ORGANIZATION_ROLE_LEVELS[requiredRole]

	return userRoleLevel >= requiredRoleLevel
}

/**
 * Require user to have minimum organization role - throws 403 if not
 */
export async function requireUserWithOrganizationRole(
	request: Request,
	organizationId: string,
	requiredRole: OrganizationRoleName,
): Promise<string> {
	const userId = await getUserId(request)
	if (!userId) {
		throw data(
			{ error: 'Unauthorized', message: 'Authentication required' },
			{ status: 401 }
		)
	}

	const hasRole = await userHasOrganizationRole(userId, organizationId, requiredRole)
	if (!hasRole) {
		throw data(
			{
				error: 'Unauthorized',
				requiredRole,
				message: `Insufficient permissions: required ${requiredRole} role in organization`
			},
			{ status: 403 }
		)
	}

	return userId
}

/**
 * Check if the user has access to the specified organization
 * Throws a 403 Response if user doesn't have access
 */
export async function userHasOrgAccess(
	request: Request,
	organizationId: string,
): Promise<boolean> {
	// Get the current user ID from the session (handles impersonation correctly)
	const userId = await getUserId(request)

	if (!userId) {
		throw new Response('Unauthorized', { status: 401 })
	}

	// Get user details for logging
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, username: true },
	})

	if (!user) {
		throw new Response('User not found', { status: 401 })
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
