/**
 * Security Alerting Service
 *
 * Provides real-time security alerting for audit events
 * to meet SOC 2 CC7.2 compliance requirements.
 */

import { prisma } from '@repo/database'
import { logger } from '@repo/observability'
import { AuditAction } from './actions.ts'

/**
 * Alert severity levels
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Alert configuration for different event types
 */
export interface AlertRule {
	action: AuditAction | AuditAction[]
	severity: AlertSeverity
	threshold?: number // Number of events within window to trigger
	windowMinutes?: number // Time window for threshold counting
	message: string
}

/**
 * Security alert payload
 */
export interface SecurityAlert {
	id: string
	severity: AlertSeverity
	action: AuditAction
	message: string
	details: string
	userId?: string
	organizationId?: string
	ipAddress?: string
	metadata?: Record<string, any>
	triggeredAt: Date
	eventCount?: number
}

/**
 * Default alert rules based on security best practices
 */
const DEFAULT_ALERT_RULES: AlertRule[] = [
	// Authentication failures - brute force detection
	{
		action: AuditAction.USER_LOGIN_FAILED,
		severity: 'high',
		threshold: 5,
		windowMinutes: 15,
		message: 'Multiple failed login attempts detected',
	},
	// Security violations
	{
		action: AuditAction.SECURITY_VIOLATION,
		severity: 'critical',
		message: 'Security violation detected',
	},
	// Suspicious activity
	{
		action: AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
		severity: 'high',
		message: 'Suspicious activity detected',
	},
	// Rate limiting
	{
		action: AuditAction.RATE_LIMIT_EXCEEDED,
		severity: 'medium',
		threshold: 10,
		windowMinutes: 5,
		message: 'Excessive rate limit violations',
	},
	// SSO failures
	{
		action: AuditAction.SSO_LOGIN_FAILED,
		severity: 'medium',
		threshold: 3,
		windowMinutes: 10,
		message: 'Multiple SSO authentication failures',
	},
	// Admin impersonation (always alert)
	{
		action: AuditAction.ADMIN_IMPERSONATION_START,
		severity: 'medium',
		message: 'Admin impersonation session started',
	},
	// User banning
	{
		action: AuditAction.USER_BANNED,
		severity: 'medium',
		message: 'User account banned',
	},
	// Data deletion requests
	{
		action: AuditAction.DATA_DELETION_REQUESTED,
		severity: 'low',
		message: 'User data deletion requested',
	},
]

/**
 * Alert handler function type
 */
type AlertHandler = (alert: SecurityAlert) => Promise<void>

/**
 * Security Alert Service
 *
 * Monitors audit events and triggers alerts based on configurable rules
 */
export class SecurityAlertService {
	private rules: AlertRule[]
	private handlers: AlertHandler[] = []

	constructor(rules: AlertRule[] = DEFAULT_ALERT_RULES) {
		this.rules = rules
		// Add default logger handler
		this.handlers.push(this.loggerHandler.bind(this))
	}

	/**
	 * Add a custom alert handler (webhook, email, etc.)
	 */
	addHandler(handler: AlertHandler): void {
		this.handlers.push(handler)
	}

	/**
	 * Process an audit event and trigger alerts if rules match
	 */
	async processEvent(event: {
		action: AuditAction
		userId?: string
		organizationId?: string
		ipAddress?: string
		details: string
		metadata?: Record<string, any>
		severity?: string
	}): Promise<SecurityAlert | null> {
		const matchingRules = this.rules.filter((rule) => {
			const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
			return actions.includes(event.action)
		})

		if (matchingRules.length === 0) {
			return null
		}

		for (const rule of matchingRules) {
			// Check threshold-based rules
			if (rule.threshold && rule.windowMinutes) {
				const shouldAlert = await this.checkThreshold(
					event,
					rule.threshold,
					rule.windowMinutes,
				)
				if (!shouldAlert) {
					continue
				}
			}

			// Create and dispatch alert
			const alert = await this.createAlert(rule, event)
			await this.dispatchAlert(alert)
			return alert
		}

		return null
	}

	/**
	 * Check if event count exceeds threshold in time window
	 */
	private async checkThreshold(
		event: { action: AuditAction; userId?: string; ipAddress?: string },
		threshold: number,
		windowMinutes: number,
	): Promise<boolean> {
		const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

		// Count similar events in the time window
		const count = await prisma.auditLog.count({
			where: {
				action: event.action,
				createdAt: { gte: windowStart },
				// Group by IP or user if available
				...(event.ipAddress && { ipAddress: event.ipAddress }),
				...(event.userId && { userId: event.userId }),
			},
		})

		return count >= threshold
	}

	/**
	 * Create an alert from a rule and event
	 */
	private async createAlert(
		rule: AlertRule,
		event: {
			action: AuditAction
			userId?: string
			organizationId?: string
			ipAddress?: string
			details: string
			metadata?: Record<string, any>
		},
	): Promise<SecurityAlert> {
		return {
			id: crypto.randomUUID(),
			severity: rule.severity,
			action: event.action,
			message: rule.message,
			details: event.details,
			userId: event.userId,
			organizationId: event.organizationId,
			ipAddress: event.ipAddress,
			metadata: event.metadata,
			triggeredAt: new Date(),
		}
	}

	/**
	 * Dispatch alert to all registered handlers
	 */
	private async dispatchAlert(alert: SecurityAlert): Promise<void> {
		await Promise.allSettled(this.handlers.map((handler) => handler(alert)))
	}

	/**
	 * Default logger handler - writes to structured logger
	 */
	private async loggerHandler(alert: SecurityAlert): Promise<void> {
		const logLevel = this.getLogLevel(alert.severity)

		logger[logLevel](
			{
				alertId: alert.id,
				alertSeverity: alert.severity,
				action: alert.action,
				userId: alert.userId,
				organizationId: alert.organizationId,
				ipAddress: alert.ipAddress,
				metadata: alert.metadata,
			},
			`SECURITY ALERT [${alert.severity.toUpperCase()}]: ${alert.message} - ${alert.details}`,
		)
	}

	/**
	 * Map alert severity to log level
	 */
	private getLogLevel(severity: AlertSeverity): 'info' | 'warn' | 'error' {
		switch (severity) {
			case 'critical':
			case 'high':
				return 'error'
			case 'medium':
				return 'warn'
			default:
				return 'info'
		}
	}

	/**
	 * Get security metrics for health check / dashboard
	 */
	async getSecurityMetrics(options: { windowMinutes?: number }): Promise<{
		totalAlerts: number
		criticalAlerts: number
		highAlerts: number
		failedLogins: number
		suspiciousActivities: number
		recentAlertActions: { action: string; count: number }[]
	}> {
		const windowStart = new Date(
			Date.now() - (options.windowMinutes ?? 60) * 60 * 1000,
		)

		// Get counts of security-relevant events
		const [failedLogins, suspiciousActivities, securityViolations] =
			await Promise.all([
				prisma.auditLog.count({
					where: {
						action: AuditAction.USER_LOGIN_FAILED,
						createdAt: { gte: windowStart },
					},
				}),
				prisma.auditLog.count({
					where: {
						action: AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
						createdAt: { gte: windowStart },
					},
				}),
				prisma.auditLog.count({
					where: {
						action: AuditAction.SECURITY_VIOLATION,
						createdAt: { gte: windowStart },
					},
				}),
			])

		// Get breakdown by action
		const alertActions = await prisma.auditLog.groupBy({
			by: ['action'],
			_count: true,
			where: {
				action: {
					in: [
						AuditAction.USER_LOGIN_FAILED,
						AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
						AuditAction.SECURITY_VIOLATION,
						AuditAction.RATE_LIMIT_EXCEEDED,
						AuditAction.SSO_LOGIN_FAILED,
					],
				},
				createdAt: { gte: windowStart },
			},
			orderBy: { _count: { action: 'desc' } },
		})

		return {
			totalAlerts: failedLogins + suspiciousActivities + securityViolations,
			criticalAlerts: securityViolations,
			highAlerts: suspiciousActivities,
			failedLogins,
			suspiciousActivities,
			recentAlertActions: alertActions.map((a: any) => ({
				action: a.action,
				count: a._count,
			})),
		}
	}
}

// Export singleton instance
export const securityAlertService = new SecurityAlertService()
