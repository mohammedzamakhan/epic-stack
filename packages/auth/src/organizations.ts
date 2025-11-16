import { useRouteLoaderData } from 'react-router'
import { type UserOrganizationWithRole } from './organizations.server'

// Keep enum for backward compatibility and type safety
export enum OrganizationRole {
	ADMIN = 'admin',
	MEMBER = 'member',
	VIEWER = 'viewer',
	GUEST = 'guest',
}

// Role level mapping for client-side hierarchy checking
export const ORGANIZATION_ROLE_LEVELS = {
	admin: 4,
	member: 3,
	viewer: 2,
	guest: 1,
} as const

export type OrganizationRoleName = keyof typeof ORGANIZATION_ROLE_LEVELS

export type UserOrganizations = {
	organizations: UserOrganizationWithRole[]
	currentOrganization: UserOrganizationWithRole | null
}

export function useOptionalUserOrganizations(): UserOrganizations | undefined {
	const data = useRouteLoaderData('root') as
		| {
				userOrganizations?: UserOrganizations
		  }
		| undefined
	return data?.userOrganizations
}

export function useUserOrganizations(): UserOrganizations {
	const data = useOptionalUserOrganizations()
	if (!data) throw new Error('User organizations not found in loader data')
	return data
}

export function useCurrentOrganization(): UserOrganizationWithRole {
	const { currentOrganization } = useUserOrganizations()
	if (!currentOrganization) throw new Error('Current organization not found')
	return currentOrganization
}

// Updated to use the new role system with level-based hierarchy
export function useUserHasOrganizationRole(
	requiredRole: OrganizationRole,
): boolean {
	const { currentOrganization } = useUserOrganizations()
	if (!currentOrganization) return false

	// Use the level from the organizationRole relationship if available
	const userRoleLevel =
		currentOrganization.organizationRole?.level ||
		ORGANIZATION_ROLE_LEVELS[
			currentOrganization.organizationRole?.name as OrganizationRoleName
		] ||
		0

	const requiredRoleLevel = ORGANIZATION_ROLE_LEVELS[requiredRole]

	return userRoleLevel >= requiredRoleLevel
}

// New helper functions for the improved role system
export function useUserHasMinimumOrganizationRole(
	requiredRole: OrganizationRoleName,
	orgId?: string,
): boolean {
	const { organizations, currentOrganization } = useUserOrganizations()
	const targetOrg = orgId
		? organizations.find((org) => org.organization.id === orgId)
		: currentOrganization

	if (!targetOrg) return false

	const userRoleLevel = targetOrg.organizationRole?.level || 0
	const requiredRoleLevel = ORGANIZATION_ROLE_LEVELS[requiredRole]

	return userRoleLevel >= requiredRoleLevel
}

export function getUserOrganizationRole(
	organizations: UserOrganizationWithRole[],
	orgId: string,
): OrganizationRoleName | null {
	const org = organizations.find((o) => o.organization.id === orgId)
	return (org?.organizationRole?.name as OrganizationRoleName) || null
}

export function userHasExactOrganizationRole(
	organizations: UserOrganizationWithRole[],
	orgId: string,
	exactRole: OrganizationRoleName,
): boolean {
	const userRole = getUserOrganizationRole(organizations, orgId)
	return userRole === exactRole
}
