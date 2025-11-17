// Shared permission utilities

type Action = 'create' | 'read' | 'update' | 'delete'
type Entity = 'user' | 'note'
type Access = 'own' | 'any' | 'own,any' | 'any,own'
export type PermissionString =
	| `${Action}:${Entity}`
	| `${Action}:${Entity}:${Access}`

export function parsePermissionString(permissionString: PermissionString) {
	const [action, entity, access] = permissionString.split(':') as [
		Action,
		Entity,
		Access | undefined,
	]
	return {
		action,
		entity,
		access: access ? (access.split(',') as Array<Access>) : undefined,
	}
}

export function userHasPermission<
	TUser extends { roles: Array<{ permissions: Array<{ action: string; entity: string; access: string }> }> }
>(
	user: TUser | null | undefined,
	permission: PermissionString,
) {
	if (!user) return false
	const { action, entity, access } = parsePermissionString(permission)
	return user.roles.some((role) =>
		role.permissions.some(
			(perm) =>
				perm.entity === entity &&
				perm.action === action &&
				(!access || access.some(a => perm.access === a)),
		),
	)
}

export function userHasRole<
	TUser extends { roles: Array<{ name: string }> }
>(
	user: TUser | null,
	role: string,
) {
	if (!user) return false
	return user.roles.some((r) => r.name === role)
}
