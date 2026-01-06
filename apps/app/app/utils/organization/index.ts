/**
 * Organization Utils - Organization management utilities
 */

// Organization management (uses Prisma for persistence)
export {
	getUserOrganizations,
	getUserDefaultOrganization,
	setUserDefaultOrganization,
	createOrganization,
	getOrganizationBySlug,
	getOrganizationByDomain,
	discoverOrganizationFromEmail,
	checkUserOrganizationAccess,
	ORGANIZATION_ROLE_LEVELS,
	userHasOrganizationRole,
	requireUserWithOrganizationRole,
	userHasOrgAccess,
	getOrganizationWithAccess,
	type OrganizationWithImage,
	type UserOrganizationWithRole,
	type OrganizationRoleName,
} from './organizations.server.ts'

// Organization types and utilities
export * from './organizations.ts'

// Organization invitations
export * from './invitation.server.ts'

// Organization loader utilities
export * from './loader.server.ts'

// Organization permissions (server)
export * from './permissions.server.ts'

// Permission types only (avoid duplicates with permissions.server.ts)
export type { OrganizationPermissionString as OrganizationPermissionType } from './permissions.ts'
