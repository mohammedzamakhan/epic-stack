/**
 * Permission-based UI components for conditional rendering
 * Hide/show elements based on user's organization permissions
 */

import type { ReactNode } from 'react'
import { 
	useHasPermission, 
	useHasAllPermissions, 
	useHasAnyPermission,
	useOrganizationRole,
	type PermissionString 
} from '#app/hooks/use-organization-permissions'

interface PermissionGuardProps {
	children: ReactNode
	fallback?: ReactNode
}

interface RequirePermissionProps extends PermissionGuardProps {
	permission: PermissionString
}

interface RequireAllPermissionsProps extends PermissionGuardProps {
	permissions: PermissionString[]
}

interface RequireAnyPermissionProps extends PermissionGuardProps {
	permissions: PermissionString[]
}

interface RequireRoleProps extends PermissionGuardProps {
	role: string | string[]
	minLevel?: number
}

/**
 * Show content only if user has the specified permission
 * 
 * @example
 * <RequirePermission permission="delete:note:own">
 *   <Button variant="destructive">Delete Note</Button>
 * </RequirePermission>
 */
export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
	const hasPermission = useHasPermission()
	
	if (!hasPermission(permission)) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

/**
 * Show content only if user has ALL specified permissions
 * 
 * @example
 * <RequireAllPermissions permissions={["read:member:any", "update:member:any"]}>
 *   <MemberManagementPanel />
 * </RequireAllPermissions>
 */
export function RequireAllPermissions({ permissions, children, fallback = null }: RequireAllPermissionsProps) {
	const hasAllPermissions = useHasAllPermissions()
	
	if (!hasAllPermissions(permissions)) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

/**
 * Show content if user has ANY of the specified permissions
 * 
 * @example
 * <RequireAnyPermission permissions={["delete:note:own", "delete:note:org"]}>
 *   <Button variant="destructive">Delete</Button>
 * </RequireAnyPermission>
 */
export function RequireAnyPermission({ permissions, children, fallback = null }: RequireAnyPermissionProps) {
	const hasAnyPermission = useHasAnyPermission()
	
	if (!hasAnyPermission(permissions)) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

/**
 * Show content only if user has the specified role(s) or minimum level
 * 
 * @example
 * <RequireRole role="admin">
 *   <AdminPanel />
 * </RequireRole>
 * 
 * <RequireRole role={["admin", "member"]}>
 *   <MemberContent />
 * </RequireRole>
 * 
 * <RequireRole minLevel={3}>
 *   <HighLevelContent />
 * </RequireRole>
 */
export function RequireRole({ role, minLevel, children, fallback = null }: RequireRoleProps) {
	const userRole = useOrganizationRole()
	
	if (!userRole) {
		return <>{fallback}</>
	}
	
	// Check by role name(s)
	if (role) {
		const allowedRoles = Array.isArray(role) ? role : [role]
		if (!allowedRoles.includes(userRole.name)) {
			return <>{fallback}</>
		}
	}
	
	// Check by minimum level
	if (minLevel !== undefined && userRole.level < minLevel) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

/**
 * Convenience components for common permission checks
 */

export function AdminOnly({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequireRole role="admin" fallback={fallback}>
			{children}
		</RequireRole>
	)
}

export function MemberOrAbove({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequireRole role={["admin", "member"]} fallback={fallback}>
			{children}
		</RequireRole>
	)
}

export function ViewerOrAbove({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequireRole role={["admin", "member", "viewer"]} fallback={fallback}>
			{children}
		</RequireRole>
	)
}

/**
 * Note-specific permission guards
 */

interface NotePermissionGuardProps extends PermissionGuardProps {
	noteOwnerId?: string
	currentUserId?: string
}

export function CanCreateNotes({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequirePermission permission="create:note:own" fallback={fallback}>
			{children}
		</RequirePermission>
	)
}

export function CanEditNote({ 
	noteOwnerId, 
	currentUserId, 
	children, 
	fallback = null 
}: NotePermissionGuardProps) {
	const hasPermission = useHasPermission()
	
	// Check if user can edit any note or if they own this specific note
	const canEdit = hasPermission('update:note:org') || 
		(hasPermission('update:note:own') && noteOwnerId === currentUserId)
	
	if (!canEdit) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

export function CanDeleteNote({ 
	noteOwnerId, 
	currentUserId, 
	children, 
	fallback = null 
}: NotePermissionGuardProps) {
	const hasPermission = useHasPermission()
	
	// Check if user can delete any note or if they own this specific note
	const canDelete = hasPermission('delete:note:org') || 
		(hasPermission('delete:note:own') && noteOwnerId === currentUserId)
	
	if (!canDelete) {
		return <>{fallback}</>
	}
	
	return <>{children}</>
}

/**
 * Member management permission guards
 */

export function CanInviteMembers({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequirePermission permission="create:member:any" fallback={fallback}>
			{children}
		</RequirePermission>
	)
}

export function CanManageMembers({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequireAnyPermission 
			permissions={["update:member:any", "delete:member:any"]} 
			fallback={fallback}
		>
			{children}
		</RequireAnyPermission>
	)
}

/**
 * Settings permission guards
 */

export function CanManageSettings({ children, fallback = null }: PermissionGuardProps) {
	return (
		<RequirePermission permission="update:settings:any" fallback={fallback}>
			{children}
		</RequirePermission>
	)
}
