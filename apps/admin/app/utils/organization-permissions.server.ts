// Re-export most functions from auth package
export * from '@repo/auth'
import {
	requireUserWithOrganizationPermission as _requireUserWithOrganizationPermission,
	type OrganizationPermissionString,
} from '@repo/auth'
import { getUserId } from './auth.server.ts'

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
	return _requireUserWithOrganizationPermission(userId ?? undefined, organizationId, permission)
}
