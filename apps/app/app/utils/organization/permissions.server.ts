import {
	requireUserWithOrganizationPermission as _requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
	getUserOrganizationPermissionsForClient,
	type OrganizationPermissionString,
	getUserId,
} from '@repo/auth'

export { ORG_PERMISSIONS, getUserOrganizationPermissionsForClient }

/**
 * Require user to have organization permission - throws 403 if not
 * This is a wrapper around the shared function that gets userId from the request
 */
export async function requireUserWithOrganizationPermission(
	request: Request,
	organizationId: string,
	permission: OrganizationPermissionString,
): Promise<string> {
	const userId = await getUserId(request)
	if (!userId) {
		throw new Response('Unauthorized', { status: 401 })
	}
	return _requireUserWithOrganizationPermission(
		userId,
		organizationId,
		permission,
	)
}
