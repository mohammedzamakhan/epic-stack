import { type User } from '@prisma/client'
import { data } from 'react-router'
import { prisma } from '@repo/prisma'
import { getUserId } from './auth.server.ts'
import { auditService, AuditAction } from './audit.server.ts'

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

/**
 * Shared select structure for user organization queries
 */
const userOrganizationSelect = {
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
} as const

export async function getUserDefaultOrganization(userId: User['id']) {
	const defaultOrg = await prisma.userOrganization.findFirst({
		where: { userId, isDefault: true, active: true },
		select: userOrganizationSelect,
	})

	if (!defaultOrg) {
		// If no default organization is set, get the first active organization
		const firstOrg = await prisma.userOrganization.findFirst({
			where: { userId, active: true },
			select: userOrganizationSelect,
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
	request,
}: {
	name: string
	slug: string
	description?: string
	userId: string
	imageObjectKey?: string
	request?: Request
}) {
	const organization = await prisma.$transaction(async (tx) => {
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

	// Log the organization creation
	await auditService.log({
		action: AuditAction.ORG_CREATED,
		userId,
		organizationId: organization.id,
		details: `Organization created: ${name}`,
		metadata: {
			organizationName: name,
			organizationSlug: slug,
			description,
			hasImage: !!imageObjectKey,
		},
		request,
		resourceType: 'organization',
		resourceId: organization.id,
	})

	return organization
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

export async function getOrganizationByDomain(domain: string) {
	return prisma.organization.findFirst({
		where: {
			verifiedDomain: domain.toLowerCase(),
		},
		select: {
			id: true,
			name: true,
			slug: true,
			verifiedDomain: true,
		},
	})
}

export async function discoverOrganizationFromEmail(email: string) {
	const domain = email.split('@')[1]
	if (!domain) return null

	return getOrganizationByDomain(domain)
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
			{ status: 401 },
		)
	}

	const hasRole = await userHasOrganizationRole(
		userId,
		organizationId,
		requiredRole,
	)
	if (!hasRole) {
		throw data(
			{
				error: 'Unauthorized',
				requiredRole,
				message: `Insufficient permissions: required ${requiredRole} role in organization`,
			},
			{ status: 403 },
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

/**
 * Get organization by slug and verify user has access to it.
 * Combines getOrganizationBySlug with user access verification.
 * Throws 404 if organization not found, 403 if user doesn't have access.
 *
 * @param orgSlug - The organization slug
 * @param userId - The user ID to check access for
 * @param select - Optional custom select fields (defaults to id, name, slug)
 * @returns The organization with specified fields
 */
export async function getOrganizationWithAccess<
	T extends Record<string, any> = { id: true; name: true; slug: true },
>(
	orgSlug: string,
	userId: string,
	select?: T,
): Promise<{
	[K in keyof T]: T[K] extends true
	? K extends 'id' | 'name' | 'slug'
	? string
	: any
	: any
}> {
	const organization = await prisma.organization.findFirst({
		where: {
			slug: orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: select || ({ id: true, name: true, slug: true } as any),
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	return organization as any
}
