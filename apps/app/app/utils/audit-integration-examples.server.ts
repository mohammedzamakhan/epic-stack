/**
 * Audit Logging Integration Examples
 *
 * This file provides examples of how to integrate the unified audit logging
 * service throughout your application. Copy these patterns to instrument
 * your routes and services.
 */

import { auditService, AuditAction } from './audit.server.ts'

/**
 * Example 1: User Registration/Creation
 *
 * Add to: apps/app/app/routes/_auth+/signup.tsx (or similar)
 */
export async function exampleUserCreated(
	userId: string,
	email: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.USER_CREATED,
		userId,
		details: `New user account created: ${email}`,
		metadata: {
			email,
			signupMethod: 'email', // or 'sso', 'oauth', etc.
		},
		request,
		severity: 'info',
		resourceType: 'user',
		resourceId: userId,
	})
}

/**
 * Example 2: User Login
 *
 * Add to: apps/app/app/routes/_auth+/login.tsx
 */
export async function exampleUserLogin(
	userId: string,
	email: string,
	request: Request,
	success: boolean = true,
) {
	await auditService.logAuth(
		success ? AuditAction.USER_LOGIN : AuditAction.USER_LOGIN_FAILED,
		userId,
		success
			? `User logged in successfully: ${email}`
			: `Failed login attempt for: ${email}`,
		{
			email,
			loginMethod: 'password', // or 'sso', 'passkey', etc.
		},
		request,
		success,
	)
}

/**
 * Example 3: Password Reset
 *
 * Add to: apps/app/app/routes/_auth+/reset-password.tsx
 */
export async function examplePasswordReset(
	userId: string,
	email: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.PASSWORD_RESET_COMPLETED,
		userId,
		details: `Password reset completed for: ${email}`,
		metadata: {
			email,
		},
		request,
		severity: 'warning', // Password changes are security-relevant
		resourceType: 'user',
		resourceId: userId,
	})
}

/**
 * Example 4: Organization Created
 *
 * Add to: apps/app/app/routes/_app+/organizations.create.tsx
 */
export async function exampleOrganizationCreated(
	orgId: string,
	orgName: string,
	creatorUserId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.ORG_CREATED,
		userId: creatorUserId,
		organizationId: orgId,
		details: `Organization created: ${orgName}`,
		metadata: {
			organizationName: orgName,
		},
		request,
		severity: 'info',
		resourceType: 'organization',
		resourceId: orgId,
	})
}

/**
 * Example 5: Organization Member Added
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/settings.members.tsx
 */
export async function exampleOrganizationMemberAdded(
	orgId: string,
	orgName: string,
	adminUserId: string,
	newMemberUserId: string,
	newMemberEmail: string,
	role: string,
	request: Request,
) {
	await auditService.logUserManagement(
		AuditAction.ORG_MEMBER_ADDED,
		adminUserId,
		newMemberUserId,
		orgId,
		`Member added to ${orgName}: ${newMemberEmail} as ${role}`,
		{
			organizationName: orgName,
			memberEmail: newMemberEmail,
			role,
		},
		request,
	)
}

/**
 * Example 6: Organization Member Role Changed
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/settings.members.tsx
 */
export async function exampleOrganizationMemberRoleChanged(
	orgId: string,
	adminUserId: string,
	targetUserId: string,
	oldRole: string,
	newRole: string,
	request: Request,
) {
	await auditService.logUserManagement(
		AuditAction.ORG_MEMBER_ROLE_CHANGED,
		adminUserId,
		targetUserId,
		orgId,
		`Member role changed from ${oldRole} to ${newRole}`,
		{
			oldRole,
			newRole,
		},
		request,
	)
}

/**
 * Example 7: Note Created
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/notes.create.tsx
 */
export async function exampleNoteCreated(
	noteId: string,
	noteTitle: string,
	userId: string,
	organizationId: string,
	request: Request,
) {
	await auditService.logDataOperation(
		AuditAction.NOTE_CREATED,
		userId,
		organizationId,
		'note',
		noteId,
		`Note created: ${noteTitle}`,
		{
			noteTitle,
		},
		request,
	)
}

/**
 * Example 8: Note Deleted
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/notes.$noteId.delete.tsx
 */
export async function exampleNoteDeleted(
	noteId: string,
	noteTitle: string,
	userId: string,
	organizationId: string,
	request: Request,
) {
	await auditService.logDataOperation(
		AuditAction.NOTE_DELETED,
		userId,
		organizationId,
		'note',
		noteId,
		`Note deleted: ${noteTitle}`,
		{
			noteTitle,
		},
		request,
	)
}

/**
 * Example 9: Note Shared
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/notes.$noteId.share.tsx
 */
export async function exampleNoteShared(
	noteId: string,
	noteTitle: string,
	ownerId: string,
	sharedWithUserId: string,
	sharedWithEmail: string,
	organizationId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.NOTE_SHARED,
		userId: ownerId,
		organizationId,
		targetUserId: sharedWithUserId,
		details: `Note shared: "${noteTitle}" with ${sharedWithEmail}`,
		metadata: {
			noteTitle,
			sharedWithEmail,
		},
		request,
		resourceType: 'note',
		resourceId: noteId,
	})
}

/**
 * Example 10: Admin Impersonation Start
 *
 * Add to: apps/admin/app/routes/_admin+/users+/$userId.impersonate.tsx
 */
export async function exampleAdminImpersonationStart(
	adminUserId: string,
	targetUserId: string,
	targetUserEmail: string,
	request: Request,
) {
	await auditService.logAdminOperation(
		AuditAction.ADMIN_IMPERSONATION_START,
		adminUserId,
		`Started impersonating user: ${targetUserEmail}`,
		{
			targetUserId,
			targetUserEmail,
			startTime: new Date().toISOString(),
		},
		request,
	)
}

/**
 * Example 11: Admin Impersonation End
 *
 * Add to: apps/admin/app/routes/_admin+/stop-impersonation.tsx
 */
export async function exampleAdminImpersonationEnd(
	adminUserId: string,
	targetUserId: string,
	targetUserEmail: string,
	durationMs: number,
	request: Request,
) {
	await auditService.logAdminOperation(
		AuditAction.ADMIN_IMPERSONATION_END,
		adminUserId,
		`Stopped impersonating user: ${targetUserEmail}`,
		{
			targetUserId,
			targetUserEmail,
			duration: durationMs,
			durationMinutes: Math.floor(durationMs / 1000 / 60),
		},
		request,
	)
}

/**
 * Example 12: API Key Created
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/settings.api-keys.tsx
 */
export async function exampleAPIKeyCreated(
	apiKeyId: string,
	apiKeyName: string,
	userId: string,
	organizationId: string,
	request: Request,
) {
	await auditService.logSecurityEvent(
		AuditAction.API_KEY_CREATED,
		`API key created: ${apiKeyName}`,
		{
			apiKeyId,
			apiKeyName,
			userId,
			organizationId,
		},
		request,
	)
}

/**
 * Example 13: API Key Revoked
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/settings.api-keys.$keyId.revoke.tsx
 */
export async function exampleAPIKeyRevoked(
	apiKeyId: string,
	apiKeyName: string,
	userId: string,
	organizationId: string,
	request: Request,
) {
	await auditService.logSecurityEvent(
		AuditAction.API_KEY_REVOKED,
		`API key revoked: ${apiKeyName}`,
		{
			apiKeyId,
			apiKeyName,
			userId,
			organizationId,
		},
		request,
		'warning',
	)
}

/**
 * Example 14: User Banned
 *
 * Add to: apps/admin/app/routes/_admin+/users+/$userId.ban.tsx
 */
export async function exampleUserBanned(
	adminUserId: string,
	targetUserId: string,
	targetUserEmail: string,
	reason: string,
	request: Request,
) {
	await auditService.logUserManagement(
		AuditAction.USER_BANNED,
		adminUserId,
		targetUserId,
		undefined,
		`User banned: ${targetUserEmail}`,
		{
			reason,
			targetUserEmail,
		},
		request,
	)
}

/**
 * Example 15: Suspicious Activity Detected
 *
 * Add to: Rate limiting, fraud detection, or security monitoring code
 */
export async function exampleSuspiciousActivity(
	userId: string | undefined,
	activityType: string,
	details: string,
	metadata: Record<string, any>,
	request: Request,
) {
	await auditService.logSecurityEvent(
		AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
		`Suspicious activity detected: ${activityType} - ${details}`,
		{
			...metadata,
			activityType,
		},
		request,
		'error',
	)
}

/**
 * Example 16: Integration Connected
 *
 * Add to: apps/app/app/routes/_app+/$orgSlug_+/integrations.$provider.connect.tsx
 */
export async function exampleIntegrationConnected(
	integrationId: string,
	providerName: string,
	userId: string,
	organizationId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.INTEGRATION_CONNECTED,
		userId,
		organizationId,
		details: `Integration connected: ${providerName}`,
		metadata: {
			providerName,
			integrationId,
		},
		request,
		resourceType: 'integration',
		resourceId: integrationId,
	})
}

/**
 * Example 17: Data Export Requested (GDPR compliance)
 *
 * Add to: apps/app/app/routes/_app+/settings.privacy.export.tsx
 */
export async function exampleDataExportRequested(
	userId: string,
	email: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.DATA_EXPORT_REQUESTED,
		userId,
		details: `User requested data export: ${email}`,
		metadata: {
			email,
			gdprCompliance: true,
		},
		request,
		severity: 'info',
	})
}

/**
 * Example 18: Subscription Changed
 *
 * Add to: Stripe webhook handler or subscription management
 */
export async function exampleSubscriptionUpdated(
	organizationId: string,
	oldPlan: string,
	newPlan: string,
	userId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.SUBSCRIPTION_UPDATED,
		userId,
		organizationId,
		details: `Subscription changed from ${oldPlan} to ${newPlan}`,
		metadata: {
			oldPlan,
			newPlan,
		},
		request,
		resourceType: 'subscription',
		resourceId: organizationId,
	})
}

/**
 * HOW TO USE THESE EXAMPLES:
 *
 * 1. Import the audit service in your route:
 *    import { auditService, AuditAction } from '#app/utils/audit.server.ts'
 *
 * 2. Call the appropriate log method after the operation succeeds:
 *    await auditService.log({ ... })
 *
 * 3. Always log AFTER the database operation succeeds, not before
 *
 * 4. Include relevant context in metadata for debugging
 *
 * 5. Set appropriate severity levels:
 *    - info: Normal operations (user created, note updated)
 *    - warning: Security-relevant (password changed, API key revoked)
 *    - error: Failed operations (suspicious activity)
 *    - critical: System-level issues (data breach, security violation)
 *
 * 6. For sensitive operations, always include the Request object
 *    to capture IP address and user agent
 */
