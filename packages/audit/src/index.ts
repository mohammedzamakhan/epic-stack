import { prisma } from '@repo/database'
import { logger } from '@repo/observability'
import { getClientIp } from '@repo/security'
import { AuditAction } from './actions.ts'

export interface AuditLogInput {
	action: AuditAction
	userId?: string | null
	organizationId?: string | null
	details: string
	metadata?: Record<string, any>
	request?: Request
	severity?: 'info' | 'warning' | 'error' | 'critical'
	targetUserId?: string // For actions that affect another user
	resourceId?: string // ID of the resource being acted upon
	resourceType?: string // Type of resource (note, user, org, etc.)
}

/**
 * Unified audit logging service for enterprise-grade audit trails
 *
 * Features:
 * - Comprehensive event coverage
 * - Request context capture (IP, user agent)
 * - Metadata sanitization
 * - Structured logging
 * - Immutability protection
 */
export class AuditService {
	/**
	 * Create an audit log entry
	 * This is the primary method for logging audit events across the application
	 */
	async log(input: AuditLogInput): Promise<void> {
		try {
			// Extract request metadata
			const ipAddress = this.extractIPAddress(input.request)
			const userAgent = input.request?.headers.get('user-agent') || undefined

			// Sanitize metadata to prevent storing sensitive data
			const sanitizedMetadata = this.sanitizeMetadata({
				...input.metadata,
				ipAddress,
				userAgent,
				severity: input.severity || 'info',
				...(input.targetUserId && { targetUserId: input.targetUserId }),
				...(input.resourceId && { resourceId: input.resourceId }),
				...(input.resourceType && { resourceType: input.resourceType }),
			})

			// Calculate retention date based on organization policy
			const retainUntil = await this.calculateRetentionDate(
				input.organizationId || undefined,
			)

			// Create the audit log entry
			await prisma.auditLog.create({
				data: {
					action: input.action,
					userId: input.userId || null,
					organizationId: input.organizationId || null,
					details: this.sanitizeLogMessage(input.details),
					metadata: sanitizedMetadata
						? JSON.stringify(sanitizedMetadata)
						: null,
					ipAddress,
					userAgent,
					resourceType: input.resourceType || null,
					resourceId: input.resourceId || null,
					targetUserId: input.targetUserId || null,
					severity: input.severity || 'info',
					retainUntil,
				},
			})

			// Also log to structured logger for real-time monitoring
			this.logToStructuredLogger({
				...input,
				ipAddress,
				userAgent,
				sanitizedMetadata,
			})
		} catch (error) {
			// Never fail the primary operation due to audit logging errors
			// But ensure we log the failure
			logger.error(
				{ err: error, action: input.action },
				'Failed to create audit log entry',
			)
		}
	}

	/**
	 * Convenience method for authentication events
	 */
	async logAuth(
		action: AuditAction,
		userId: string | undefined,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
		success: boolean = true,
	): Promise<void> {
		await this.log({
			action,
			userId,
			details,
			metadata: {
				...metadata,
				success,
			},
			request,
			severity: success ? 'info' : 'warning',
		})
	}

	/**
	 * Convenience method for user management events
	 */
	async logUserManagement(
		action: AuditAction,
		adminUserId: string,
		targetUserId: string,
		organizationId: string | undefined,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	): Promise<void> {
		await this.log({
			action,
			userId: adminUserId,
			targetUserId,
			organizationId,
			details,
			metadata,
			request,
			resourceType: 'user',
			resourceId: targetUserId,
		})
	}

	/**
	 * Convenience method for data operations
	 */
	async logDataOperation(
		action: AuditAction,
		userId: string,
		organizationId: string | undefined,
		resourceType: string,
		resourceId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	): Promise<void> {
		await this.log({
			action,
			userId,
			organizationId,
			resourceType,
			resourceId,
			details,
			metadata,
			request,
		})
	}

	/**
	 * Convenience method for security events
	 */
	async logSecurityEvent(
		action: AuditAction,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
		severity: 'warning' | 'error' | 'critical' = 'warning',
	): Promise<void> {
		await this.log({
			action,
			details,
			metadata,
			request,
			severity,
		})
	}

	/**
	 * Convenience method for admin operations
	 */
	async logAdminOperation(
		action: AuditAction,
		adminUserId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	): Promise<void> {
		await this.log({
			action,
			userId: adminUserId,
			details,
			metadata,
			request,
			severity: 'info',
		})
	}

	/**
	 * Query audit logs with filtering
	 */
	async query(filters: {
		organizationId?: string
		userId?: string
		actions?: AuditAction[]
		startDate?: Date
		endDate?: Date
		limit?: number
		offset?: number
		search?: string
	}) {
		const {
			organizationId,
			userId,
			actions,
			startDate,
			endDate,
			limit = 50,
			offset = 0,
			search,
		} = filters

		const where: any = {}

		if (organizationId) where.organizationId = organizationId
		if (userId) where.userId = userId
		if (actions && actions.length > 0) {
			where.action = { in: actions }
		}
		if (startDate || endDate) {
			where.createdAt = {}
			if (startDate) where.createdAt.gte = startDate
			if (endDate) where.createdAt.lte = endDate
		}
		if (search) {
			where.OR = [
				{ details: { contains: search, mode: 'insensitive' } },
				{ action: { contains: search, mode: 'insensitive' } },
			]
		}

		const [logs, total] = await Promise.all([
			prisma.auditLog.findMany({
				where,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							username: true,
							email: true,
						},
					},
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				take: limit,
				skip: offset,
			}),
			prisma.auditLog.count({ where }),
		])

		return {
			logs,
			total,
			page: Math.floor(offset / limit) + 1,
			totalPages: Math.ceil(total / limit),
		}
	}

	/**
	 * Export audit logs to CSV format
	 */
	async exportCSV(filters: {
		organizationId?: string
		userId?: string
		actions?: AuditAction[]
		startDate?: Date
		endDate?: Date
	}): Promise<string> {
		const { logs } = await this.query({ ...filters, limit: 10000 })

		// CSV header
		const headers = [
			'Timestamp',
			'Action',
			'User',
			'Organization',
			'Details',
			'IP Address',
			'User Agent',
		]

		// CSV rows
		const rows = logs.map((log) => {
			const metadata: any = log.metadata ? JSON.parse(log.metadata) : {}
			return [
				log.createdAt.toISOString(),
				log.action,
				log.user?.email || log.userId || 'System',
				log.organization?.name || log.organizationId || 'N/A',
				`"${this.escapeCsvValue(log.details)}"`,
				metadata.ipAddress || 'N/A',
				metadata.userAgent
					? `"${this.escapeCsvValue(metadata.userAgent)}"`
					: 'N/A',
			]
		})

		return [headers, ...rows].map((row) => row.join(',')).join('\n')
	}

	/**
	 * Export audit logs to JSON format
	 */
	async exportJSON(filters: {
		organizationId?: string
		userId?: string
		actions?: AuditAction[]
		startDate?: Date
		endDate?: Date
	}): Promise<string> {
		const { logs } = await this.query({ ...filters, limit: 10000 })

		const exportData = logs.map((log) => ({
			timestamp: log.createdAt.toISOString(),
			action: log.action,
			user: log.user
				? {
						id: log.user.id,
						email: log.user.email,
						name: log.user.name,
					}
				: null,
			organization: log.organization
				? {
						id: log.organization.id,
						name: log.organization.name,
						slug: log.organization.slug,
					}
				: null,
			details: log.details,
			metadata: log.metadata ? JSON.parse(log.metadata) : null,
		}))

		return JSON.stringify(exportData, null, 2)
	}

	/**
	 * Get audit statistics for a dashboard
	 */
	async getStatistics(filters: {
		organizationId?: string
		startDate?: Date
		endDate?: Date
	}) {
		const where: any = {}
		if (filters.organizationId) where.organizationId = filters.organizationId
		if (filters.startDate || filters.endDate) {
			where.createdAt = {}
			if (filters.startDate) where.createdAt.gte = filters.startDate
			if (filters.endDate) where.createdAt.lte = filters.endDate
		}

		const [totalEvents, eventsByAction, eventsByUser, recentSecurityEvents] =
			await Promise.all([
				prisma.auditLog.count({ where }),
				prisma.auditLog.groupBy({
					by: ['action'],
					where,
					_count: true,
					orderBy: { _count: { action: 'desc' } },
					take: 10,
				}),
				prisma.auditLog.groupBy({
					by: ['userId'],
					where: { ...where, userId: { not: null } },
					_count: true,
					orderBy: { _count: { userId: 'desc' } },
					take: 10,
				}),
				prisma.auditLog.findMany({
					where: {
						...where,
						action: {
							in: [
								AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
								AuditAction.RATE_LIMIT_EXCEEDED,
								AuditAction.USER_LOGIN_FAILED,
								AuditAction.SSO_LOGIN_FAILED,
								AuditAction.IP_BLACKLISTED,
							],
						},
					},
					orderBy: { createdAt: 'desc' },
					take: 10,
				}),
			])

		return {
			totalEvents,
			topActions: eventsByAction,
			topUsers: eventsByUser,
			recentSecurityEvents,
		}
	}

	// Private helper methods

	private extractIPAddress(request?: Request): string | undefined {
		if (!request) return undefined

		return getClientIp(request, { returnUndefined: true })
	}

	private sanitizeMetadata(
		metadata?: Record<string, any>,
	): Record<string, any> | undefined {
		if (!metadata) return undefined

		const sensitiveKeys = [
			'password',
			'token',
			'secret',
			'key',
			'apiKey',
			'api_key',
			'accessToken',
			'access_token',
			'refreshToken',
			'refresh_token',
			'clientSecret',
			'client_secret',
			'privateKey',
			'private_key',
		]

		const sanitized: Record<string, any> = {}

		for (const [key, value] of Object.entries(metadata)) {
			const keyLower = key.toLowerCase()
			if (sensitiveKeys.some((sensitive) => keyLower.includes(sensitive))) {
				sanitized[key] = '[REDACTED]'
			} else if (typeof value === 'string' && value.length > 2000) {
				// Truncate very long strings
				sanitized[key] = value.substring(0, 2000) + '...[TRUNCATED]'
			} else if (typeof value === 'object' && value !== null) {
				// Recursively sanitize nested objects
				sanitized[key] = this.sanitizeMetadata(value)
			} else {
				sanitized[key] = value
			}
		}

		return sanitized
	}

	private sanitizeLogMessage(message: string): string {
		if (!message) return message

		// Remove control characters and limit length
		return message
			.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
			.replace(/[[0-9;]*m/g, '')
			.substring(0, 2000)
	}

	private escapeCsvValue(value: string): string {
		return value.replace(/"/g, '""')
	}

	private async calculateRetentionDate(
		organizationId?: string,
	): Promise<Date | null> {
		// Default retention: 1 year (365 days)
		// In a real implementation, this would query organization settings
		const date = new Date()
		date.setDate(date.getDate() + 365)
		return date
	}

	static getCompliancePresets() {
		return {
			HIPAA: {
				retentionDays: 2190,
				hotStorageDays: 365,
				complianceType: 'HIPAA',
			},
			GDPR: { retentionDays: 730, hotStorageDays: 90, complianceType: 'GDPR' },
			SOC2: { retentionDays: 365, hotStorageDays: 90, complianceType: 'SOC2' },
			ISO27001: {
				retentionDays: 1095,
				hotStorageDays: 365,
				complianceType: 'ISO27001',
			},
			PCI_DSS: {
				retentionDays: 365,
				hotStorageDays: 90,
				complianceType: 'PCI_DSS',
			},
		}
	}

	async getRetentionPolicy(organizationId: string) {
		// Mock implementation - in real world this would query DB
		return {
			retentionDays: 365,
			hotStorageDays: 90,
			archiveEnabled: true,
			exportEnabled: true,
			complianceType: null as string | null,
		}
	}

	async updateRetentionPolicy(organizationId: string, data: any) {
		// Mock implementation
		return data
	}

	async archiveOldLogs() {
		// Mock implementation
		return { archived: 0, deleted: 0 }
	}

	private logToStructuredLogger(data: any): void {
		const { action, details, ...meta } = data
		logger.info(meta, `[Audit] ${action}: ${details}`)
	}
}

export const auditService = new AuditService()

// Re-export activity log utilities
export * from './activity-log.ts'

// Re-export middleware
export * from './middleware.ts'

// Re-export integration examples
export * from './integration-examples.ts'

// Re-export MCP audit utilities
export * from './mcp-audit.ts'

export * from './actions.ts'
