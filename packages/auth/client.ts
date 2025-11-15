// Client-safe exports - no server-only modules

// User utilities (client hooks)
export * from './src/user'

// Organization permission hooks (client-side)
export {
	useUserHasOrganizationPermission,
	useCurrentOrganizationPermissions,
	useUserHasAnyOrganizationPermission,
	useUserHasAllOrganizationPermissions,
} from './src/organization-permissions'

// Permission hooks
export type { UserOrganizationPermissions } from './src/use-organization-permissions'
export {
	useOrganizationPermissions,
	useHasPermission,
	useHasAllPermissions,
	useHasAnyPermission,
	useNotePermissions,
	useMemberPermissions,
	useSettingsPermissions,
	useOrganizationRole,
} from './src/use-organization-permissions'

// Provider constants (no server code)
export * from './src/providers/constants'

// Last login method (types only)
export * from './src/last-login-method'

// User validation schemas
export * from './src/user-validation'

// Connection types/constants (client-safe parts from connections.tsx)
export { ProviderNameSchema, providerLabels, providerIcons, GITHUB_PROVIDER_NAME, GOOGLE_PROVIDER_NAME } from './src/connections'
