import { prisma } from './db.server.ts'
import { logger, sentryLogger } from '@repo/observability'
import { getClientIp } from '@repo/security'

// SSO-specific audit event types
export enum SSOAuditEventType {
	// Configuration events
	CONFIG_CREATED = 'sso_config_created',
	CONFIG_UPDATED = 'sso_config_updated',
	CONFIG_ENABLED = 'sso_config_enabled',
	CONFIG_DISABLED = 'sso_config_disabled',
	CONFIG_DELETED = 'sso_config_deleted',
	CONFIG_TESTED = 'sso_config_tested',

	// Authentication events
	AUTH_INITIATED = 'sso_auth_initiated',
	AUTH_SUCCESS = 'sso_auth_success',
	AUTH_FAILED = 'sso_auth_failed',
	AUTH_CALLBACK_RECEIVED = 'sso_auth_callback_received',
	AUTH_TOKEN_EXCHANGED = 'sso_auth_token_exchanged',
	AUTH_USER_PROVISIONED = 'sso_auth_user_provisioned',

	// Session events
	SESSION_CREATED = 'sso_session_created',
	SESSION_REFRESHED = 'sso_session_refreshed',
	SESSION_REVOKED = 'sso_session_revoked',
	SESSION_EXPIRED = 'sso_session_expired',

	// User management events
	USER_ROLE_CHANGED = 'sso_user_role_changed',
	USER_ACTIVATED = 'sso_user_activated',
	USER_DEACTIVATED = 'sso_user_deactivated',
	USER_PERMISSIONS_UPDATED = 'sso_user_permissions_updated',

	// Security events
	SUSPICIOUS_ACTIVITY = 'sso_suspicious_activity',
	RATE_LIMIT_EXCEEDED = 'sso_rate_limit_exceeded',
	INVALID_REQUEST = 'sso_invalid_request',
	SECURITY_VIOLATION = 'sso_security_violation',

	// System events
	HEALTH_CHECK_FAILED = 'sso_health_check_failed',
	PROVIDER_UNAVAILABLE = 'sso_provider_unavailable',
	CONFIGURATION_ERROR = 'sso_configuration_error',
	VALIDATION_FAILED = 'sso_validation_failed',
	PERIODIC_VALIDATION = 'sso_periodic_validation',
	CONFIG_WARNING = 'sso_config_warning',
	CONFIG_ERROR = 'sso_config_error',
}

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
	timestamp: Date
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
 */
export class SSOAuditLogger {
	/**
	 * Log an SSO audit event
	 */
	async logEvent(entry: Omit<SSOAuditLogEntry, 'timestamp'>): Promise<void> {
		try {
			const logEntry = {
				...entry,
				timestamp: new Date(),
			}

			// Log to console for immediate visibility
			this.logToConsole(logEntry)

			// Store in database (if AuditLog model exists)
			await this.storeInDatabase(logEntry)

			// Send to external monitoring systems
			await this.sendToMonitoring(logEntry)

			// Handle critical events immediately
			if (logEntry.severity === 'critical') {
				await this.handleCriticalEvent(logEntry)
			}
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
		await this.logEvent({
			eventType,
			organizationId,
			userId,
			ssoConfigId,
			ipAddress: this.extractIPAddress(request),
			userAgent: request?.headers.get('user-agent') || undefined,
			details,
			metadata,
			severity: 'info',
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
		await this.logEvent({
			eventType,
			organizationId,
			userId,
			sessionId,
			ipAddress: this.extractIPAddress(request),
			userAgent: request?.headers.get('user-agent') || undefined,
			details,
			metadata,
			severity,
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
		await this.logEvent({
			eventType,
			organizationId,
			ipAddress: this.extractIPAddress(request),
			userAgent: request?.headers.get('user-agent') || undefined,
			details,
			metadata,
			severity,
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
		await this.logEvent({
			eventType,
			details,
			metadata,
			severity,
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
		// This would query the database when AuditLog model is available
		// For now, return empty array
		return []
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
		// This would calculate metrics from audit logs
		// For now, return default metrics
		return {
			totalAuthAttempts: 0,
			successfulAuths: 0,
			failedAuths: 0,
			configurationChanges: 0,
			suspiciousActivities: 0,
			averageAuthTime: 0,
			topFailureReasons: [],
			organizationStats: [],
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
		const issues: string[] = []
		let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

		try {
			// Check database connectivity
			await prisma.$queryRaw`SELECT 1`

			// Check for high error rates
			const recentErrors = await this.getRecentErrorCount()
			if (recentErrors > 10) {
				issues.push(`High error rate: ${recentErrors} errors in the last hour`)
				status = 'degraded'
			}

			// Check for configuration issues
			const configIssues = await this.checkConfigurationHealth()
			if (configIssues.length > 0) {
				issues.push(...configIssues)
				status = status === 'healthy' ? 'degraded' : 'unhealthy'
			}

			return {
				status,
				issues,
				metrics: {
					errorRate: recentErrors,
					averageResponseTime: 0, // Would calculate from logs
					activeConfigurations: 0, // Would count from database
				},
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				issues: [
					`Database connectivity error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				],
				metrics: {
					errorRate: 0,
					averageResponseTime: 0,
					activeConfigurations: 0,
				},
			}
		}
	}

	/**
	 * Log to console with structured format using Pino
	 */
	private logToConsole(entry: SSOAuditLogEntry): void {
		// Sanitize sensitive data from metadata
		const sanitizedMetadata = this.sanitizeMetadata(entry.metadata)

		// Sanitize details to prevent log injection
		const sanitizedDetails = this.sanitizeLogMessage(entry.details)

		// Sanitize IP address (keep first 3 octets for IPv4)
		const sanitizedIP = this.sanitizeIPAddress(entry.ipAddress)

		const logData = {
			ssoAuditEvent: true,
			eventType: entry.eventType,
			organizationId: entry.organizationId,
			userId: this.sanitizeUserId(entry.userId),
			sessionId: entry.sessionId,
			ssoConfigId: entry.ssoConfigId,
			ipAddress: sanitizedIP,
			severity: entry.severity,
			metadata: sanitizedMetadata,
		}

		// Use appropriate logger method based on severity
		// Use sentryLogger only for errors/critical to avoid Sentry noise
		// SSO warnings (failed logins, validation errors) are frequent during normal operations
		if (entry.severity === 'critical') {
			sentryLogger.fatal(logData, `SSO Audit: ${sanitizedDetails}`)
		} else if (entry.severity === 'error') {
			sentryLogger.error(logData, `SSO Audit: ${sanitizedDetails}`)
		} else if (entry.severity === 'warning') {
			logger.warn(logData, `SSO Audit: ${sanitizedDetails}`)
		} else {
			logger.info(logData, `SSO Audit: ${sanitizedDetails}`)
		}
	}

	/**
	 * Sanitize metadata to remove sensitive information
	 */
	private sanitizeMetadata(
		metadata?: Record<string, any>,
	): Record<string, any> | undefined {
		if (!metadata) return undefined

		const sensitiveKeys = [
			'clientSecret',
			'client_secret',
			'password',
			'token',
			'accessToken',
			'access_token',
			'refreshToken',
			'refresh_token',
			'idToken',
			'id_token',
			'secret',
			'key',
			'apiKey',
			'api_key',
		]

		const sanitized: Record<string, any> = {}

		for (const [key, value] of Object.entries(metadata)) {
			if (
				sensitiveKeys.some((sensitive) =>
					key.toLowerCase().includes(sensitive.toLowerCase()),
				)
			) {
				sanitized[key] = '[REDACTED]'
			} else if (typeof value === 'string' && value.length > 1000) {
				// Truncate very long strings to prevent log flooding
				sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]'
			} else {
				sanitized[key] = value
			}
		}

		return sanitized
	}

	/**
	 * Sanitize log messages to prevent injection attacks
	 */
	private sanitizeLogMessage(message: string): string {
		if (!message) return message

		// Remove control characters and ANSI escape sequences
		return message
			.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
			.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI escape sequences
			.substring(0, 2000) // Limit message length
	}

	/**
	 * Sanitize IP addresses for privacy
	 */
	private sanitizeIPAddress(ip?: string): string | undefined {
		if (!ip) return undefined

		// For IPv4, keep first 3 octets
		const ipv4Match = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/)
		if (ipv4Match) {
			return `${ipv4Match[1]}.xxx`
		}

		// For IPv6, keep first 4 groups
		const ipv6Match = ip.match(/^([0-9a-fA-F:]+)::[0-9a-fA-F:]+$/)
		if (ipv6Match) {
			return `${ipv6Match[1]}::xxxx`
		}

		// Return as-is for other formats (might be proxy headers)
		return ip
	}

	/**
	 * Sanitize user IDs to prevent XSS in logs
	 */
	private sanitizeUserId(userId?: string): string | undefined {
		if (!userId) return undefined

		// Remove HTML/script tags and limit length
		return userId
			.replace(/<[^>]*>/g, '') // Remove HTML tags
			.replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
			.substring(0, 100) // Limit length
	}

	/**
	 * Store audit log in database
	 */
	private async storeInDatabase(entry: SSOAuditLogEntry): Promise<void> {
		try {
			// This would store in AuditLog table when available
			// For now, we'll use a simple log table or file storage
			// Example implementation when AuditLog model is available:
			// await prisma.auditLog.create({
			//   data: {
			//     organizationId: entry.organizationId,
			//     userId: entry.userId,
			//     action: entry.eventType,
			//     details: entry.details,
			//     metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
			//     ipAddress: entry.ipAddress,
			//     userAgent: entry.userAgent,
			//     severity: entry.severity,
			//     createdAt: entry.timestamp,
			//   },
			// })
		} catch (error) {
			logger.error({ err: error }, 'Failed to store audit log in database')
		}
	}

	/**
	 * Send audit logs to external monitoring systems
	 */
	private async sendToMonitoring(entry: SSOAuditLogEntry): Promise<void> {
		try {
			// Send to monitoring services like DataDog, New Relic, etc.
			// This would be configured based on environment variables

			if (process.env.DATADOG_API_KEY) {
				// await sendToDataDog(entry)
			}

			if (process.env.NEW_RELIC_LICENSE_KEY) {
				// await sendToNewRelic(entry)
			}

			if (process.env.SENTRY_DSN) {
				// await sendToSentry(entry)
			}
		} catch (error) {
			logger.error({ err: error }, 'Failed to send audit log to monitoring')
		}
	}

	/**
	 * Handle critical events that require immediate attention
	 */
	private async handleCriticalEvent(entry: SSOAuditLogEntry): Promise<void> {
		try {
			// Send immediate alerts for critical events
			// This is already logged via logToConsole with sentryLogger.fatal

			// Send to alerting systems
			if (process.env.SLACK_WEBHOOK_URL) {
				// await sendSlackAlert(entry)
			}

			if (process.env.PAGERDUTY_INTEGRATION_KEY) {
				// await sendPagerDutyAlert(entry)
			}
		} catch (error) {
			logger.error({ err: error }, 'Failed to handle critical SSO event')
		}
	}

	/**
	 * Extract IP address from request
	 */
	private extractIPAddress(request?: Request): string | undefined {
		if (!request) return undefined

		return getClientIp(request, { returnUndefined: true })
	}

	/**
	 * Get recent error count for health monitoring
	 */
	private async getRecentErrorCount(): Promise<number> {
		// This would query audit logs for recent errors
		// For now, return 0
		return 0
	}

	/**
	 * Check configuration health
	 */
	private async checkConfigurationHealth(): Promise<string[]> {
		const issues: string[] = []

		try {
			// Check for configurations that haven't been tested recently
			// Check for disabled configurations
			// Check for configurations with invalid settings
			// This would query the SSO configurations and validate them
		} catch (error) {
			issues.push(
				`Configuration health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}

		return issues
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
		userId,
		sessionId,
		'SSO authentication successful',
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
