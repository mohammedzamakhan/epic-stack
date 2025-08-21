import { type UserOrganizationWithRole } from './organizations.server'
import { ORG_PERMISSIONS } from './organization-permissions.server'

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
 * Check if user has organization permission on client side
 */
export function userHasOrganizationPermission(
	organizations: UserOrganizationWithRole[],
	organizationId: string,
	permission: OrganizationPermissionString,
): boolean {
	const userOrg = organizations.find(
		(org) => org.organization.id === organizationId,
	)
	if (!userOrg?.organizationRole.permissions) return false

	const { action, entity, access } =
		parseOrganizationPermissionString(permission)

	return userOrg.organizationRole.permissions.some(
		(p) =>
			p.action === action &&
			p.entity === entity &&
			(!access || access.includes(p.access)),
	)
}

/**
 * Hook to check organization permission for current organization
 */
export function useUserHasOrganizationPermission(
	permission: OrganizationPermissionString,
	organizationId?: string,
): boolean {
	const { organizations, currentOrganization } = useUserOrganizations()
	const targetOrgId = organizationId || currentOrganization?.organization.id

	if (!targetOrgId) return false

	return userHasOrganizationPermission(organizations, targetOrgId, permission)
}

/**
 * Hook to get all permissions for current organization
 */
export function useCurrentOrganizationPermissions() {
	const { currentOrganization } = useUserOrganizations()
	return currentOrganization?.organizationRole.permissions || []
}

/**
 * Hook to check multiple permissions at once
 */
export function useUserHasAnyOrganizationPermission(
	permissions: OrganizationPermissionString[],
	organizationId?: string,
): boolean {
	const { organizations, currentOrganization } = useUserOrganizations()
	const targetOrgId = organizationId || currentOrganization?.organization.id

	if (!targetOrgId) return false

	return permissions.some((permission) =>
		userHasOrganizationPermission(organizations, targetOrgId, permission),
	)
}

/**
 * Hook to check if user has all specified permissions
 */
export function useUserHasAllOrganizationPermissions(
	permissions: OrganizationPermissionString[],
	organizationId?: string,
): boolean {
	const { organizations, currentOrganization } = useUserOrganizations()
	const targetOrgId = organizationId || currentOrganization?.organization.id

	if (!targetOrgId) return false

	return permissions.every((permission) =>
		userHasOrganizationPermission(organizations, targetOrgId, permission),
	)
}

// Re-export constants for convenience
export { ORG_PERMISSIONS }

// Import the hook we need (this would be imported from the organizations utils)
import { useUserOrganizations } from './organizations'
