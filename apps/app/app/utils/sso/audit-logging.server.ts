import { AuditAction, auditService } from '@repo/audit'
import { logger } from '@repo/observability'

// Map SSO audit event types to unified AuditAction
// This maintains backward compatibility with existing SSO code
export const SSOAuditEventType = {
	// Configuration events
	CONFIG_CREATED: AuditAction.SSO_CONFIG_CREATED,
	CONFIG_UPDATED: AuditAction.SSO_CONFIG_UPDATED,
	CONFIG_ENABLED: AuditAction.SSO_CONFIG_ENABLED,
	CONFIG_DISABLED: AuditAction.SSO_CONFIG_DISABLED,
	CONFIG_DELETED: AuditAction.SSO_CONFIG_DELETED,
	CONFIG_TESTED: AuditAction.SSO_CONFIG_TESTED,

	// Authentication events
	AUTH_INITIATED: AuditAction.SSO_AUTH_INITIATED,
	AUTH_SUCCESS: AuditAction.SSO_LOGIN,
	AUTH_FAILED: AuditAction.SSO_LOGIN_FAILED,
	AUTH_CALLBACK_RECEIVED: AuditAction.SSO_AUTH_CALLBACK_RECEIVED,
	AUTH_TOKEN_EXCHANGED: AuditAction.SSO_AUTH_TOKEN_EXCHANGED,
	AUTH_USER_PROVISIONED: AuditAction.SSO_USER_PROVISIONED,

	// Session events
	SESSION_CREATED: AuditAction.SESSION_CREATED,
	SESSION_REFRESHED: AuditAction.SESSION_REFRESHED,
	SESSION_REVOKED: AuditAction.SESSION_REVOKED,
	SESSION_EXPIRED: AuditAction.SESSION_EXPIRED,

	// User management events
	USER_ROLE_CHANGED: AuditAction.SSO_USER_ROLE_CHANGED,
	USER_ACTIVATED: AuditAction.USER_ACTIVATED,
	USER_DEACTIVATED: AuditAction.USER_DEACTIVATED,
	USER_PERMISSIONS_UPDATED: AuditAction.USER_PERMISSIONS_UPDATED,

	// Security events
	SUSPICIOUS_ACTIVITY: AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
	RATE_LIMIT_EXCEEDED: AuditAction.RATE_LIMIT_EXCEEDED,
	INVALID_REQUEST: AuditAction.INVALID_REQUEST,
	SECURITY_VIOLATION: AuditAction.SECURITY_VIOLATION,

	// System events
	HEALTH_CHECK_FAILED: AuditAction.SSO_HEALTH_CHECK_FAILED,
	PROVIDER_UNAVAILABLE: AuditAction.SSO_PROVIDER_UNAVAILABLE,
	CONFIGURATION_ERROR: AuditAction.SSO_CONFIGURATION_ERROR,
	VALIDATION_FAILED: AuditAction.SSO_VALIDATION_FAILED,
	PERIODIC_VALIDATION: AuditAction.SSO_PERIODIC_VALIDATION,
	CONFIG_WARNING: AuditAction.SSO_CONFIG_WARNING,
	CONFIG_ERROR: AuditAction.SSO_CONFIG_ERROR,
} as const

export type SSOAuditEventType =
	(typeof SSOAuditEventType)[keyof typeof SSOAuditEventType]

export interface SSOAuditLogEntry {
	eventType: SSOAuditEventType
	organizationId?: string
	userId?: string
	sessionId?: string
	ssoConfigId?: string
	ipAddress?: string
	userAgent?: string
	details: string
	metadata?: Record<string, any>
	severity: 'info' | 'warning' | 'error' | 'critical'
	timestamp?: Date
}

export interface SSOMetrics {
	totalAuthAttempts: number
	successfulAuths: number
	failedAuths: number
	configurationChanges: number
	suspiciousActivities: number
	averageAuthTime: number
	topFailureReasons: Array<{ reason: string; count: number }>
	organizationStats: Array<{ organizationId: string; authCount: number }>
}

/**
 * SSO Audit Logging Service
 * Adapts the SSO logging interface to the unified AuditService
 */
export class SSOAuditLogger {
	/**
	 * Log an SSO audit event
	 */
	async logEvent(entry: Omit<SSOAuditLogEntry, 'timestamp'>): Promise<void> {
		try {
			// Convert to unified audit log format
			await auditService.log({
				action: entry.eventType as AuditAction,
				userId: entry.userId,
				organizationId: entry.organizationId,
				details: entry.details,
				metadata: {
					...entry.metadata,
					sessionId: entry.sessionId,
					ssoConfigId: entry.ssoConfigId,
				},
				severity: entry.severity,
				request: this.createMockRequest(entry.ipAddress, entry.userAgent),
			})
		} catch (error) {
			logger.error({ err: error }, 'Failed to log SSO audit event')
		}
	}

	/**
	 * Log SSO configuration changes
	 */
	async logConfigurationChange(
		eventType: SSOAuditEventType,
		organizationId: string,
		userId: string,
		ssoConfigId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	): Promise<void> {
		await auditService.log({
			action: eventType as AuditAction,
			userId,
			organizationId,
			details,
			metadata: {
				...metadata,
				ssoConfigId,
			},
			severity: 'info',
			request,
		})
	}

	/**
	 * Log SSO authentication events
	 */
	async logAuthenticationEvent(
		eventType: SSOAuditEventType,
		organizationId: string,
		details: string,
		userId?: string,
		sessionId?: string,
		metadata?: Record<string, any>,
		request?: Request,
		severity: 'info' | 'warning' | 'error' = 'info',
	): Promise<void> {
		await auditService.log({
			action: eventType as AuditAction,
			userId,
			organizationId,
			details,
			metadata: {
				...metadata,
				sessionId,
			},
			severity:
				severity === 'error'
					? 'error'
					: severity === 'warning'
						? 'warning'
						: 'info',
			request,
		})
	}

	/**
	 * Log security events
	 */
	async logSecurityEvent(
		eventType: SSOAuditEventType,
		organizationId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
		severity: 'warning' | 'error' | 'critical' = 'warning',
	): Promise<void> {
		await auditService.log({
			action: eventType as AuditAction,
			organizationId,
			details,
			metadata,
			severity,
			request,
		})
	}

	/**
	 * Log system events
	 */
	async logSystemEvent(
		eventType: SSOAuditEventType,
		details: string,
		metadata?: Record<string, any>,
		severity: 'info' | 'warning' | 'error' = 'info',
	): Promise<void> {
		await auditService.log({
			action: eventType as AuditAction,
			details,
			metadata,
			severity:
				severity === 'error'
					? 'error'
					: severity === 'warning'
						? 'warning'
						: 'info',
		})
	}

	/**
	 * Get SSO audit logs for an organization
	 */
	async getOrganizationLogs(
		organizationId: string,
		options: {
			eventTypes?: SSOAuditEventType[]
			startDate?: Date
			endDate?: Date
			limit?: number
			offset?: number
		} = {},
	): Promise<SSOAuditLogEntry[]> {
		const result = await auditService.query({
			organizationId,
			actions: options.eventTypes as AuditAction[],
			startDate: options.startDate,
			endDate: options.endDate,
			limit: options.limit,
			offset: options.offset,
		})

		// Map back to SSOAuditLogEntry format
		return result.logs.map((log) => {
			const metadata = (log.metadata ? JSON.parse(log.metadata) : {}) as Record<
				string,
				any
			>
			return {
				eventType: log.action as unknown as SSOAuditEventType,
				organizationId: log.organizationId || undefined,
				userId: log.userId || undefined,
				sessionId: metadata.sessionId,
				ssoConfigId: metadata.ssoConfigId,
				ipAddress: log.ipAddress || undefined,
				userAgent: log.userAgent || undefined,
				details: log.details,
				metadata,
				severity: log.severity as any,
				timestamp: log.createdAt,
			}
		})
	}

	/**
	 * Get SSO metrics for monitoring dashboard
	 */
	async getSSOMetrics(
		organizationId?: string,
		timeRange: { start: Date; end: Date } = {
			start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
			end: new Date(),
		},
	): Promise<SSOMetrics> {
		// Use the unified audit service statistics
		const stats = await auditService.getStatistics({
			organizationId,
			startDate: timeRange.start,
			endDate: timeRange.end,
		})

		// Transform unified stats to SSO specific metrics
		// Note: This is an approximation based on the unified stats
		// For detailed metrics, we might need more specific queries in AuditService

		const ssoActions = stats.topActions.filter((a) =>
			a.action.startsWith('sso_'),
		)
		const totalAuthAttempts = ssoActions.reduce(
			(sum, a) => sum + (a.action.includes('login') ? a._count : 0),
			0,
		)
		const failedAuths = ssoActions.reduce(
			(sum, a) => sum + (a.action.includes('failed') ? a._count : 0),
			0,
		)

		return {
			totalAuthAttempts,
			successfulAuths: totalAuthAttempts - failedAuths,
			failedAuths,
			configurationChanges: ssoActions.reduce(
				(sum, a) => sum + (a.action.includes('config') ? a._count : 0),
				0,
			),
			suspiciousActivities: stats.recentSecurityEvents.length,
			averageAuthTime: 0, // Not tracked in audit logs
			topFailureReasons: [], // Would need detailed parsing
			organizationStats: [], // Would need detailed parsing
		}
	}

	/**
	 * Monitor SSO system health
	 */
	async checkSSOHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy'
		issues: string[]
		metrics: {
			errorRate: number
			averageResponseTime: number
			activeConfigurations: number
		}
	}> {
		// Delegate to audit service health check logic if available, or keep existing logic
		// For now, we'll keep a minimal implementation that checks DB
		try {
			// Check database connectivity via audit service (implicitly)
			await auditService.getStatistics({ limit: 1 } as any)

			return {
				status: 'healthy',
				issues: [],
				metrics: {
					errorRate: 0,
					averageResponseTime: 0,
					activeConfigurations: 0,
				},
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				issues: [
					`Audit service connectivity error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				],
				metrics: {
					errorRate: 0,
					averageResponseTime: 0,
					activeConfigurations: 0,
				},
			}
		}
	}

	private createMockRequest(
		ip?: string,
		userAgent?: string,
	): Request | undefined {
		if (!ip && !userAgent) return undefined

		const headers = new Headers()
		if (ip) headers.set('X-Forwarded-For', ip)
		if (userAgent) headers.set('User-Agent', userAgent)

		return {
			headers,
		} as unknown as Request
	}
}

// Export singleton instance
export const ssoAuditLogger = new SSOAuditLogger()

// Convenience functions for common audit events
export const auditSSOConfigCreated = (
	organizationId: string,
	userId: string,
	ssoConfigId: string,
	request?: Request,
) =>
	ssoAuditLogger.logConfigurationChange(
		SSOAuditEventType.CONFIG_CREATED,
		organizationId,
		userId,
		ssoConfigId,
		'SSO configuration created',
		undefined,
		request,
	)

export const auditSSOConfigUpdated = (
	organizationId: string,
	userId: string,
	ssoConfigId: string,
	changes: Record<string, any>,
	request?: Request,
) =>
	ssoAuditLogger.logConfigurationChange(
		SSOAuditEventType.CONFIG_UPDATED,
		organizationId,
		userId,
		ssoConfigId,
		'SSO configuration updated',
		{ changes },
		request,
	)

export const auditSSOAuthSuccess = (
	organizationId: string,
	userId: string,
	sessionId: string,
	request?: Request,
) =>
	ssoAuditLogger.logAuthenticationEvent(
		SSOAuditEventType.AUTH_SUCCESS,
		organizationId,
		'SSO authentication successful',
		userId,
		sessionId,
		undefined,
		request,
		'info',
	)

export const auditSSOAuthFailed = (
	organizationId: string,
	reason: string,
	metadata?: Record<string, any>,
	request?: Request,
) =>
	ssoAuditLogger.logAuthenticationEvent(
		SSOAuditEventType.AUTH_FAILED,
		organizationId,
		`SSO authentication failed: ${reason}`,
		undefined,
		undefined,
		metadata,
		request,
		'warning',
	)

export const auditSSOSuspiciousActivity = (
	organizationId: string,
	details: string,
	metadata?: Record<string, any>,
	request?: Request,
) =>
	ssoAuditLogger.logSecurityEvent(
		SSOAuditEventType.SUSPICIOUS_ACTIVITY,
		organizationId,
		details,
		metadata,
		request,
		'error',
	)
