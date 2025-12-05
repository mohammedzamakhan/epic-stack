import { auditService, AuditAction } from '#app/utils/audit.server.ts'

/**
 * MCP OAuth audit logging utilities
 * Logs all MCP OAuth events for security and compliance
 */

/**
 * Log authorization request
 */
export async function logMCPAuthorizationRequested(
	userId: string,
	organizationId: string,
	clientName: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_AUTHORIZATION_REQUESTED,
		userId,
		organizationId,
		details: `MCP authorization requested by ${clientName}`,
		metadata: {
			clientName,
		},
		request,
	})
}

/**
 * Log authorization approval
 */
export async function logMCPAuthorizationApproved(
	userId: string,
	organizationId: string,
	clientName: string,
	authorizationId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_AUTHORIZATION_APPROVED,
		userId,
		organizationId,
		details: `MCP authorization approved for ${clientName}`,
		metadata: {
			clientName,
			authorizationId,
		},
		request,
	})
}

/**
 * Log authorization denial
 */
export async function logMCPAuthorizationDenied(
	userId: string,
	organizationId: string,
	clientName: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_AUTHORIZATION_DENIED,
		userId,
		organizationId,
		details: `MCP authorization denied for ${clientName}`,
		metadata: {
			clientName,
		},
		request,
	})
}

/**
 * Log token issuance
 */
export async function logMCPTokenIssued(
	userId: string,
	organizationId: string,
	authorizationId: string,
	clientName: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_TOKEN_ISSUED,
		userId,
		organizationId,
		details: `MCP tokens issued for ${clientName}`,
		metadata: {
			clientName,
			authorizationId,
		},
		request,
	})
}

/**
 * Log token refresh
 */
export async function logMCPTokenRefreshed(
	userId: string,
	organizationId: string,
	authorizationId: string,
	clientName: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_TOKEN_REFRESHED,
		userId,
		organizationId,
		details: `MCP access token refreshed for ${clientName}`,
		metadata: {
			clientName,
			authorizationId,
		},
		request,
	})
}

/**
 * Log authorization revocation
 */
export async function logMCPAuthorizationRevoked(
	userId: string,
	organizationId: string,
	authorizationId: string,
	clientName: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_AUTHORIZATION_REVOKED,
		userId,
		organizationId,
		details: `MCP authorization revoked for ${clientName}`,
		metadata: {
			clientName,
			authorizationId,
		},
		request,
	})
}

/**
 * Log tool invocation
 */
export async function logMCPToolInvoked(
	userId: string,
	organizationId: string,
	toolName: string,
	authorizationId: string,
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_TOOL_INVOKED,
		userId,
		organizationId,
		details: `MCP tool invoked: ${toolName}`,
		metadata: {
			toolName,
			authorizationId,
		},
		request,
	})
}

/**
 * Log rate limit exceeded
 */
export async function logMCPRateLimitExceeded(
	userId: string | undefined,
	organizationId: string | undefined,
	limitType: 'authorization' | 'token' | 'tool_invocation',
	request: Request,
) {
	await auditService.log({
		action: AuditAction.MCP_RATE_LIMIT_EXCEEDED,
		userId,
		organizationId,
		details: `MCP rate limit exceeded: ${limitType}`,
		metadata: {
			limitType,
		},
		request,
	})
}
