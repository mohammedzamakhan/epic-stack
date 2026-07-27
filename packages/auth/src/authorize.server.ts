import { requireUserId } from './auth.server'
import {
	checkUserHasPermission,
	checkUserHasRole,
} from './permissions.server'
import {
	userHasOrganizationPermission,
	type OrganizationPermissionString,
} from './organization-permissions.server'
import { type PermissionString } from '@repo/common/user-permissions'

export interface AuthorizeOptions {
	permission?: PermissionString
	role?: string
	organizationId?: string
	orgPermission?: OrganizationPermissionString
}

/**
 * Unified authorization helper for verifying user roles, user permissions,
 * and organization permissions behind a single seam.
 */
export async function authorize(
	request: Request,
	options: AuthorizeOptions,
): Promise<string> {
	const userId = await requireUserId(request)

	if (options.permission) {
		await checkUserHasPermission(userId, options.permission)
	}

	if (options.role) {
		await checkUserHasRole(userId, options.role)
	}

	if (options.organizationId && options.orgPermission) {
		const hasOrgPermission = await userHasOrganizationPermission(
			userId,
			options.organizationId,
			options.orgPermission,
		)
		if (!hasOrgPermission) {
			throw new Response(
				`Insufficient permissions: required ${options.orgPermission} in organization`,
				{ status: 403 },
			)
		}
	}

	return userId
}

/**
 * Namespace helper for user permission check
 */
authorize.userPermission = async (
	request: Request,
	permission: PermissionString,
): Promise<string> => {
	return authorize(request, { permission })
}

/**
 * Namespace helper for user role check
 */
authorize.userRole = async (
	request: Request,
	role: string,
): Promise<string> => {
	return authorize(request, { role })
}

/**
 * Namespace helper for organization permission check
 */
authorize.orgPermission = async (
	request: Request,
	organizationId: string,
	orgPermission: OrganizationPermissionString,
): Promise<string> => {
	return authorize(request, { organizationId, orgPermission })
}
