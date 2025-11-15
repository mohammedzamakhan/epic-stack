import { prisma } from '#app/utils/db.server.ts'
import { logger } from './logger.server.ts'

/**
 * Comprehensive audit action types for the entire application
 * Following enterprise best practices for audit logging
 */
export enum AuditAction {
    // Authentication & Authorization
    USER_LOGIN = 'user_login',
    USER_LOGOUT = 'user_logout',
    USER_LOGIN_FAILED = 'user_login_failed',
    PASSWORD_RESET_REQUESTED = 'password_reset_requested',
    PASSWORD_RESET_COMPLETED = 'password_reset_completed',
    PASSWORD_CHANGED = 'password_changed',
    TWO_FACTOR_ENABLED = 'two_factor_enabled',
    TWO_FACTOR_DISABLED = 'two_factor_disabled',
    SESSION_CREATED = 'session_created',
    SESSION_EXPIRED = 'session_expired',
    SESSION_REVOKED = 'session_revoked',

    // User Management
    USER_CREATED = 'user_created',
    USER_UPDATED = 'user_updated',
    USER_DELETED = 'user_deleted',
    USER_SUSPENDED = 'user_suspended',
    USER_UNSUSPENDED = 'user_unsuspended',
    USER_BANNED = 'user_banned',
    USER_UNBANNED = 'user_unbanned',
    USER_EMAIL_VERIFIED = 'user_email_verified',
    USER_PROFILE_UPDATED = 'user_profile_updated',

    // Role & Permission Management
    USER_ROLE_ASSIGNED = 'user_role_assigned',
    USER_ROLE_REMOVED = 'user_role_removed',
    USER_PERMISSION_GRANTED = 'user_permission_granted',
    USER_PERMISSION_REVOKED = 'user_permission_revoked',
    ROLE_CREATED = 'role_created',
    ROLE_UPDATED = 'role_updated',
    ROLE_DELETED = 'role_deleted',

    // Organization Management
    ORG_CREATED = 'org_created',
    ORG_UPDATED = 'org_updated',
    ORG_DELETED = 'org_deleted',
    ORG_SETTINGS_UPDATED = 'org_settings_updated',
    ORG_MEMBER_ADDED = 'org_member_added',
    ORG_MEMBER_REMOVED = 'org_member_removed',
    ORG_MEMBER_ROLE_CHANGED = 'org_member_role_changed',
    ORG_INVITATION_SENT = 'org_invitation_sent',
    ORG_INVITATION_ACCEPTED = 'org_invitation_accepted',
    ORG_INVITATION_REVOKED = 'org_invitation_revoked',
    ORG_INVITE_LINK_CREATED = 'org_invite_link_created',
    ORG_INVITE_LINK_DISABLED = 'org_invite_link_disabled',

    // Data Operations - Notes
    NOTE_CREATED = 'note_created',
    NOTE_VIEWED = 'note_viewed',
    NOTE_UPDATED = 'note_updated',
    NOTE_DELETED = 'note_deleted',
    NOTE_SHARED = 'note_shared',
    NOTE_UNSHARED = 'note_unshared',
    NOTE_FAVORITED = 'note_favorited',
    NOTE_UNFAVORITED = 'note_unfavorited',
    NOTE_COMMENT_ADDED = 'note_comment_added',
    NOTE_COMMENT_UPDATED = 'note_comment_updated',
    NOTE_COMMENT_DELETED = 'note_comment_deleted',
    NOTE_STATUS_CHANGED = 'note_status_changed',
    NOTE_PRIORITY_CHANGED = 'note_priority_changed',

    // File Operations
    FILE_UPLOADED = 'file_uploaded',
    FILE_DOWNLOADED = 'file_downloaded',
    FILE_DELETED = 'file_deleted',
    BULK_FILE_UPLOAD = 'bulk_file_upload',
    BULK_FILE_DELETE = 'bulk_file_delete',

    // Integration Management
    INTEGRATION_CONNECTED = 'integration_connected',
    INTEGRATION_DISCONNECTED = 'integration_disconnected',
    INTEGRATION_CONFIGURED = 'integration_configured',
    INTEGRATION_SYNC_STARTED = 'integration_sync_started',
    INTEGRATION_SYNC_COMPLETED = 'integration_sync_completed',
    INTEGRATION_SYNC_FAILED = 'integration_sync_failed',

    // API & Security
    API_KEY_CREATED = 'api_key_created',
    API_KEY_USED = 'api_key_used',
    API_KEY_REVOKED = 'api_key_revoked',
    API_KEY_EXPIRED = 'api_key_expired',
    IP_BLACKLISTED = 'ip_blacklisted',
    IP_UNBLACKLISTED = 'ip_unblacklisted',
    SUSPICIOUS_ACTIVITY_DETECTED = 'suspicious_activity_detected',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

    // Admin Operations
    ADMIN_IMPERSONATION_START = 'admin_impersonation_start',
    ADMIN_IMPERSONATION_END = 'admin_impersonation_end',
    ADMIN_CONFIG_CHANGED = 'admin_config_changed',
    ADMIN_USER_SEARCH = 'admin_user_search',
    ADMIN_DATA_EXPORT = 'admin_data_export',

    // Subscription & Billing
    SUBSCRIPTION_CREATED = 'subscription_created',
    SUBSCRIPTION_UPDATED = 'subscription_updated',
    SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
    SUBSCRIPTION_RENEWED = 'subscription_renewed',
    PAYMENT_METHOD_ADDED = 'payment_method_added',
    PAYMENT_METHOD_REMOVED = 'payment_method_removed',
    PAYMENT_SUCCEEDED = 'payment_succeeded',
    PAYMENT_FAILED = 'payment_failed',

    // SSO (from existing implementation)
    SSO_CONFIG_CREATED = 'sso_config_created',
    SSO_CONFIG_UPDATED = 'sso_config_updated',
    SSO_CONFIG_ENABLED = 'sso_config_enabled',
    SSO_CONFIG_DISABLED = 'sso_config_disabled',
    SSO_CONFIG_DELETED = 'sso_config_deleted',
    SSO_LOGIN = 'sso_login',
    SSO_LOGOUT = 'sso_logout',
    SSO_LOGIN_FAILED = 'sso_login_failed',
    SSO_USER_PROVISIONED = 'sso_user_provisioned',
    SSO_USER_ROLE_CHANGED = 'sso_user_role_changed',

    // System Events
    SYSTEM_BACKUP_STARTED = 'system_backup_started',
    SYSTEM_BACKUP_COMPLETED = 'system_backup_completed',
    SYSTEM_RESTORE_STARTED = 'system_restore_started',
    SYSTEM_RESTORE_COMPLETED = 'system_restore_completed',
    SYSTEM_MAINTENANCE_START = 'system_maintenance_start',
    SYSTEM_MAINTENANCE_END = 'system_maintenance_end',

    // Data Privacy & Compliance
    DATA_EXPORT_REQUESTED = 'data_export_requested',
    DATA_EXPORT_COMPLETED = 'data_export_completed',
    DATA_DELETION_REQUESTED = 'data_deletion_requested',
    DATA_DELETION_COMPLETED = 'data_deletion_completed',
    GDPR_ACCESS_REQUEST = 'gdpr_access_request',
    AUDIT_LOG_EXPORTED = 'audit_log_exported',
    AUDIT_LOG_VIEWED = 'audit_log_viewed',
}

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
                    metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : null,
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
            const metadata = log.metadata ? JSON.parse(log.metadata) : {}
            return [
                log.createdAt.toISOString(),
                log.action,
                log.user?.email || log.userId || 'System',
                log.organization?.name || log.organizationId || 'N/A',
                `"${this.escapeCsvValue(log.details)}"`,
                metadata.ipAddress || 'N/A',
                metadata.userAgent ? `"${this.escapeCsvValue(metadata.userAgent)}"` : 'N/A',
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

        const [
            totalEvents,
            eventsByAction,
            eventsByUser,
            recentSecurityEvents,
        ] = await Promise.all([
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

        return (
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            request.headers.get('cf-connecting-ip') ||
            undefined
        )
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
            .replace(/[\x00-\x1F\x7F]/g, '')
            .replace(/\x1b\[[0-9;]*m/g, '')
            .substring(0, 2000)
    }

    private escapeCsvValue(value: string): string {
        return value.replace(/"/g, '""')
    }

    private logToStructuredLogger(data: any): void {
        const { severity = 'info', action, details } = data

        const logData = {
            auditEvent: true,
            action,
            userId: data.userId,
            organizationId: data.organizationId,
            ipAddress: data.ipAddress,
            ...data.sanitizedMetadata,
        }

        switch (severity) {
            case 'critical':
            case 'error':
                logger.error(logData, `Audit: ${details}`)
                break
            case 'warning':
                logger.warn(logData, `Audit: ${details}`)
                break
            default:
                logger.info(logData, `Audit: ${details}`)
        }
    }

    private async calculateRetentionDate(
        organizationId?: string,
    ): Promise<Date | null> {
        try {
            if (!organizationId) {
                // Default retention: 1 year
                const date = new Date()
                date.setFullYear(date.getFullYear() + 1)
                return date
            }

            // Get organization's retention policy
            const policy = await prisma.auditLogRetentionPolicy.findUnique({
                where: { organizationId },
            })

            const retentionDays = policy?.retentionDays || 365
            const date = new Date()
            date.setDate(date.getDate() + retentionDays)
            return date
        } catch (error) {
            // Fall back to default 1 year retention
            const date = new Date()
            date.setFullYear(date.getFullYear() + 1)
            return date
        }
    }

    /**
     * Get or create retention policy for an organization
     */
    async getRetentionPolicy(organizationId: string) {
        const policy = await prisma.auditLogRetentionPolicy.findUnique({
            where: { organizationId },
        })

        if (!policy) {
            // Create default policy
            return prisma.auditLogRetentionPolicy.create({
                data: {
                    organizationId,
                    retentionDays: 365,
                    hotStorageDays: 180,
                    archiveEnabled: true,
                    exportEnabled: true,
                    immutable: true,
                },
            })
        }

        return policy
    }

    /**
     * Update retention policy for an organization
     */
    async updateRetentionPolicy(
        organizationId: string,
        updates: {
            retentionDays?: number
            hotStorageDays?: number
            archiveEnabled?: boolean
            exportEnabled?: boolean
            complianceType?: string | null
        },
    ) {
        return prisma.auditLogRetentionPolicy.upsert({
            where: { organizationId },
            update: updates,
            create: {
                organizationId,
                retentionDays: updates.retentionDays || 365,
                hotStorageDays: updates.hotStorageDays || 180,
                archiveEnabled: updates.archiveEnabled ?? true,
                exportEnabled: updates.exportEnabled ?? true,
                complianceType: updates.complianceType,
                immutable: true,
            },
        })
    }

    /**
     * Archive old logs (move to cold storage)
     * Run this as a scheduled job
     */
    async archiveOldLogs(): Promise<{
        archived: number
        deleted: number
    }> {
        // Get all organizations with retention policies
        const policies = await prisma.auditLogRetentionPolicy.findMany()

        let totalArchived = 0
        let totalDeleted = 0

        for (const policy of policies) {
            // Archive logs older than hotStorageDays
            const archiveDate = new Date()
            archiveDate.setDate(archiveDate.getDate() - policy.hotStorageDays)

            if (policy.archiveEnabled) {
                const { count } = await prisma.auditLog.updateMany({
                    where: {
                        organizationId: policy.organizationId,
                        createdAt: { lt: archiveDate },
                        archived: false,
                    },
                    data: {
                        archived: true,
                    },
                })
                totalArchived += count
            }

            // Delete logs past retention period
            const deleteResult = await prisma.auditLog.deleteMany({
                where: {
                    organizationId: policy.organizationId,
                    retainUntil: { lt: new Date() },
                },
            })
            totalDeleted += deleteResult.count
        }

        // Handle logs without organization (system logs)
        const systemArchiveDate = new Date()
        systemArchiveDate.setDate(systemArchiveDate.getDate() - 180)

        const { count: systemArchived } = await prisma.auditLog.updateMany({
            where: {
                organizationId: null,
                createdAt: { lt: systemArchiveDate },
                archived: false,
            },
            data: {
                archived: true,
            },
        })
        totalArchived += systemArchived

        // Delete system logs older than 1 year
        const systemDeleteDate = new Date()
        systemDeleteDate.setFullYear(systemDeleteDate.getFullYear() - 1)

        const systemDeleted = await prisma.auditLog.deleteMany({
            where: {
                organizationId: null,
                retainUntil: { lt: systemDeleteDate },
            },
        })
        totalDeleted += systemDeleted.count

        return {
            archived: totalArchived,
            deleted: totalDeleted,
        }
    }

    /**
     * Get compliance presets for retention policies
     */
    static getCompliancePresets() {
        return {
            SOC2: {
                retentionDays: 365, // 1 year minimum
                hotStorageDays: 180, // 6 months searchable
                complianceType: 'SOC2',
            },
            HIPAA: {
                retentionDays: 2190, // 6 years
                hotStorageDays: 180,
                complianceType: 'HIPAA',
            },
            SOX: {
                retentionDays: 2555, // 7 years
                hotStorageDays: 365,
                complianceType: 'SOX',
            },
            PCI_DSS: {
                retentionDays: 365, // 1 year minimum
                hotStorageDays: 90,
                complianceType: 'PCI_DSS',
            },
            GDPR: {
                retentionDays: 365, // 1 year (or as needed)
                hotStorageDays: 180,
                complianceType: 'GDPR',
            },
            ISO_27001: {
                retentionDays: 730, // 2 years
                hotStorageDays: 180,
                complianceType: 'ISO_27001',
            },
        }
    }
}

// Export singleton instance
export const auditService = new AuditService()

// Convenience exports
export { auditService as audit }
