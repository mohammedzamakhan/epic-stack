import {
	checkUserHasPermission,
	checkUserHasRole,
	requireUserId,
} from '@repo/auth'
import { type PermissionString } from '@repo/common/user-permissions'

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	return checkUserHasPermission(userId, permission)
}

export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)
	const result = await checkUserHasRole(userId, name)
	return result.id
}
