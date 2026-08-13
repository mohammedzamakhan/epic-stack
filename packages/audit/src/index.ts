import { type AuditAction } from './actions.ts'
import { auditQuery, type AuditQueryFilter } from './audit-query.ts'
import { auditWriter, type AuditLogInput } from './audit-writer.ts'
import { auditRetentionManager, AuditRetentionManager } from './retention.ts'

export type { AuditLogInput }
export type { AuditQueryFilter }

/**
 * Unified Audit Service facade combining Writer, Query, and Retention concerns (WO-36).
 */
export class AuditService {
	static getCompliancePresets() {
		return AuditRetentionManager.getCompliancePresets()
	}

	log(input: AuditLogInput) {
		return auditWriter.log(input)
	}

	logAuth(
		action: AuditAction,
		userId: string | undefined,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
		success: boolean = true,
	) {
		return auditWriter.logAuth(
			action,
			userId,
			details,
			metadata,
			request,
			success,
		)
	}

	logUserManagement(
		action: AuditAction,
		adminUserId: string,
		targetUserId: string,
		organizationId: string | undefined,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	) {
		return auditWriter.logUserManagement(
			action,
			adminUserId,
			targetUserId,
			organizationId,
			details,
			metadata,
			request,
		)
	}

	logDataOperation(
		action: AuditAction,
		userId: string,
		organizationId: string | undefined,
		resourceType: string,
		resourceId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	) {
		return auditWriter.logDataOperation(
			action,
			userId,
			organizationId,
			resourceType,
			resourceId,
			details,
			metadata,
			request,
		)
	}

	logSecurityEvent(
		action: AuditAction,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
		severity: 'warning' | 'error' | 'critical' = 'warning',
	) {
		return auditWriter.logSecurityEvent(
			action,
			details,
			metadata,
			request,
			severity,
		)
	}

	logAdminOperation(
		action: AuditAction,
		adminUserId: string,
		details: string,
		metadata?: Record<string, any>,
		request?: Request,
	) {
		return auditWriter.logAdminOperation(
			action,
			adminUserId,
			details,
			metadata,
			request,
		)
	}

	validateUpdateFields(
		updateData: Record<string, any>,
		context?: { userId?: string; request?: Request },
	) {
		return auditWriter.validateUpdateFields(updateData, context)
	}

	query(filter: AuditQueryFilter) {
		return auditQuery.query(filter)
	}

	exportCSV(filter: AuditQueryFilter) {
		return auditQuery.exportCSV(filter)
	}

	exportJSON(filter: AuditQueryFilter) {
		return auditQuery.exportJSON(filter)
	}

	getStatistics(organizationId?: string, days: number = 30) {
		return auditQuery.getStatistics(organizationId, days)
	}

	calculateRetentionDate(organizationId?: string) {
		return auditRetentionManager.calculateRetentionDate(organizationId)
	}

	getCompliancePresets() {
		return AuditRetentionManager.getCompliancePresets()
	}

	getRetentionPolicy(organizationId: string) {
		return auditRetentionManager.getRetentionPolicy(organizationId)
	}

	updateRetentionPolicy(
		organizationId: string,
		data: {
			retentionDays?: number
			hotStorageDays?: number
			archiveEnabled?: boolean
			exportEnabled?: boolean
			complianceType?: string | null
		},
	) {
		return auditRetentionManager.updateRetentionPolicy(organizationId, data)
	}

	archiveOldLogs() {
		return auditRetentionManager.archiveOldLogs()
	}
}

export const auditService = new AuditService()

export * from './actions.ts'
export * from './activity-log.ts'
export * from './alerting.ts'
export * from './integrity.ts'
export * from './mcp-audit.ts'
export * from './middleware.ts'
export * from './retention.ts'
export * from './audit-writer.ts'
export * from './audit-query.ts'
