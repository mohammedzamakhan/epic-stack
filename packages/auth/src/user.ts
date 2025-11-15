import { useRouteLoaderData } from 'react-router'

// Type for root loader data
type RootLoaderData = {
	user: {
		id: string
		email: string
		username: string
		name: string | null
		imageId: string | null
		roles: Array<{
			name: string
			permissions: Array<{
				entity: string
				action: string
				access: string
			}>
		}>
	} | null
}

function isUser(user: any): user is NonNullable<RootLoaderData['user']> {
	return user && typeof user === 'object' && typeof user.id === 'string'
}

export function useOptionalUser() {
	const data = useRouteLoaderData<RootLoaderData>('root')
	if (!data || !isUser(data.user)) {
		return undefined
	}
	return data.user
}

export function useUser() {
	const maybeUser = useOptionalUser()
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		)
	}
	return maybeUser
}

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

export function userHasPermission(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null | undefined,
	permission: PermissionString,
) {
	if (!user) return false
	const { action, entity, access } = parsePermissionString(permission)
	return user.roles.some((role) =>
		role.permissions.some(
			(permission) =>
				permission.entity === entity &&
				permission.action === action &&
				(!access || access.includes(permission.access as Access)),
		),
	)
}

export function userHasRole(
	user: Pick<ReturnType<typeof useUser>, 'roles'> | null,
	role: string,
) {
	if (!user) return false
	return user.roles.some((r) => r.name === role)
}
