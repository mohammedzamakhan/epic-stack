// No longer need data import
import { prisma } from '@repo/prisma'
import { getUserId } from './auth.server.ts'
import { ORG_PERMISSIONS } from './organization-permission-constants'

export type OrganizationPermissionString = `${string}:${string}:${string}`

/**
 * Parse organization permission string like "create:org_note:own"
 */
export function parseOrganizationPermissionString(
	permissionString: OrganizationPermissionString,
) {
	const [action, entity, access] = permissionString.split(':')
	return {
		action: action?.trim() || '',
		entity: entity?.trim() || '',
		access: access ? access.split(',').map((a) => a.trim()) : undefined,
	}
}

/**
 * Check if user has organization permission
 */
export async function userHasOrganizationPermission(
	userId: string,
	organizationId: string,
	permission: OrganizationPermissionString,
): Promise<boolean> {
	const { action, entity, access } =
		parseOrganizationPermissionString(permission)

	const userOrg = await prisma.userOrganization.findFirst({
		where: {
			userId,
			organizationId,
			active: true,
		},
		include: {
			organizationRole: {
				include: {
					permissions: {
						where: {
							action,
							entity,
							context: 'organization',
							access: access ? { in: access } : undefined,
						},
					},
				},
			},
		},
	})

	if (!userOrg) return false
	return userOrg.organizationRole.permissions.length > 0
}

/**
 * Require user to have organization permission - throws 403 if not
 */
export async function requireUserWithOrganizationPermission(
	request: Request,
	organizationId: string,
	permission: OrganizationPermissionString,
): Promise<string> {
	const userId = await getUserId(request)
	if (!userId) {
		throw new Response('Authentication required', { status: 401 })
	}

	const hasPermission = await userHasOrganizationPermission(
		userId,
		organizationId,
		permission,
	)
	if (!hasPermission) {
		throw new Response(
			`Insufficient permissions: required ${permission} in organization`,
			{ status: 403 },
		)
	}

	return userId
}

/**
 * Get all permissions for user in organization
 */
export async function getUserOrganizationPermissions(
	userId: string,
	organizationId: string,
) {
	const userOrg = await prisma.userOrganization.findFirst({
		where: {
			userId,
			organizationId,
			active: true,
		},
		include: {
			organizationRole: {
				include: {
					permissions: {
						where: {
							context: 'organization',
						},
						select: {
							action: true,
							entity: true,
							access: true,
							description: true,
						},
					},
				},
			},
		},
	})

	return userOrg?.organizationRole.permissions || []
}

/**
 * Client-side permission checking for organization permissions
 */
export function userHasOrganizationPermissionClient(
	userPermissions: { action: string; entity: string; access: string }[],
	permission: OrganizationPermissionString,
): boolean {
	const { action, entity, access } =
		parseOrganizationPermissionString(permission)

	return userPermissions.some(
		(p) =>
			p.action === action &&
			p.entity === entity &&
			(!access || access.includes(p.access)),
	)
}

// Re-export organization permission constants
export { ORG_PERMISSIONS }

/**
 * Get user's organization permissions with role details for client-side use
 * Returns null if user doesn't have access to the organization
 */
export async function getUserOrganizationPermissionsForClient(
	userId: string,
	organizationId: string,
): Promise<{
	userId: string
	organizationId: string
	organizationRole: {
		id: string
		name: string
		level: number
		permissions: Array<{
			id: string
			action: string
			entity: string
			access: string
			description: string
		}>
	}
} | null> {
	const userOrg = await prisma.userOrganization.findUnique({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
		},
		include: {
			organizationRole: {
				include: {
					permissions: {
						where: {
							context: 'organization',
						},
						select: {
							id: true,
							action: true,
							entity: true,
							access: true,
							description: true,
						},
					},
				},
			},
		},
	})

	if (!userOrg || !userOrg.active) {
		return null
	}

	return {
		userId,
		organizationId,
		organizationRole: {
			id: userOrg.organizationRole.id,
			name: userOrg.organizationRole.name,
			level: userOrg.organizationRole.level,
			permissions: userOrg.organizationRole.permissions,
		},
	}
}
