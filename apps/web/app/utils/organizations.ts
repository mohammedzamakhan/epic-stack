import { useRouteLoaderData } from "react-router"
import { type UserOrganizationWithRole } from "./organizations.server"

export enum OrganizationRole {
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
  GUEST = "guest",
}

export type UserOrganizations = {
  organizations: UserOrganizationWithRole[]
  currentOrganization: UserOrganizationWithRole | null
}

export function useOptionalUserOrganizations(): UserOrganizations | undefined {
  const data = useRouteLoaderData('root') as { 
    userOrganizations?: UserOrganizations 
  } | undefined
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

export function useUserHasOrganizationRole(
  requiredRole: OrganizationRole,
): boolean {
  const { currentOrganization } = useUserOrganizations()
  if (!currentOrganization) return false

  // Simple role hierarchy check
  const roleHierarchy: Record<OrganizationRole, number> = {
    [OrganizationRole.ADMIN]: 4,
    [OrganizationRole.MEMBER]: 3,
    [OrganizationRole.VIEWER]: 2,
    [OrganizationRole.GUEST]: 1,
  }

  const userRoleLevel = roleHierarchy[currentOrganization.role as OrganizationRole] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole]

  return userRoleLevel >= requiredRoleLevel
}