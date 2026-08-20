import {
	and,
	AuditLog,
	AuditLogRetentionPolicy,
	db,
	eq,
	isNull,
	lt,
} from '@repo/database'
import { logger } from '@repo/observability'

export class AuditRetentionManager {
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

	async calculateRetentionDate(organizationId?: string): Promise<Date | null> {
		let retentionDays = 365

		if (organizationId) {
			const [policy] = await db
				.select({ retentionDays: AuditLogRetentionPolicy.retentionDays })
				.from(AuditLogRetentionPolicy)
				.where(eq(AuditLogRetentionPolicy.organizationId, organizationId))
				.limit(1)
			if (policy) {
				retentionDays = policy.retentionDays
			}
		}

		const date = new Date()
		date.setDate(date.getDate() + retentionDays)
		return date
	}

	async getRetentionPolicy(organizationId: string) {
		const [policy] = await db
			.select()
			.from(AuditLogRetentionPolicy)
			.where(eq(AuditLogRetentionPolicy.organizationId, organizationId))
			.limit(1)

		if (policy) {
			return {
				retentionDays: policy.retentionDays,
				hotStorageDays: policy.hotStorageDays,
				archiveEnabled: policy.archiveEnabled,
				exportEnabled: policy.exportEnabled,
				complianceType: policy.complianceType,
			}
		}

		return {
			retentionDays: 365,
			hotStorageDays: 90,
			archiveEnabled: true,
			exportEnabled: true,
			complianceType: null as string | null,
		}
	}

	async updateRetentionPolicy(
		organizationId: string,
		data: {
			retentionDays?: number
			hotStorageDays?: number
			archiveEnabled?: boolean
			exportEnabled?: boolean
			complianceType?: string | null
		},
	) {
		const values = {
			organizationId,
			retentionDays: data.retentionDays ?? 365,
			hotStorageDays: data.hotStorageDays ?? 90,
			archiveEnabled: data.archiveEnabled ?? true,
			exportEnabled: data.exportEnabled ?? true,
			complianceType: data.complianceType ?? null,
		}
		return db
			.insert(AuditLogRetentionPolicy)
			.values(values)
			.onConflictDoUpdate({
				target: AuditLogRetentionPolicy.organizationId,
				set: data,
			})
			.returning()
	}

	/**
	 * Single canonical implementation for audit log archival and retention cleanup (WO-35)
	 */
	async archiveOldLogs(): Promise<{ archived: number; deleted: number }> {
		const now = new Date()

		const policiesToProcess = await db
			.select({
				organizationId: AuditLogRetentionPolicy.organizationId,
				hotStorageDays: AuditLogRetentionPolicy.hotStorageDays,
				retentionDays: AuditLogRetentionPolicy.retentionDays,
			})
			.from(AuditLogRetentionPolicy)
			.where(eq(AuditLogRetentionPolicy.archiveEnabled, true))

		let totalArchived = 0
		let totalDeleted = 0

		for (const policy of policiesToProcess) {
			const archiveThreshold = new Date(now)
			archiveThreshold.setDate(
				archiveThreshold.getDate() - policy.hotStorageDays,
			)

			const archiveResult = await db
				.update(AuditLog)
				.set({ archived: true })
				.where(
					and(
						eq(AuditLog.organizationId, policy.organizationId),
						eq(AuditLog.archived, false),
						lt(AuditLog.createdAt, archiveThreshold),
					),
				)
			totalArchived += archiveResult.rowsAffected
		}

		// Handle logs without organization (system logs - 180 day archive threshold)
		const systemArchiveThreshold = new Date(now)
		systemArchiveThreshold.setDate(systemArchiveThreshold.getDate() - 180)

		const systemArchiveResult = await db
			.update(AuditLog)
			.set({ archived: true })
			.where(
				and(
					isNull(AuditLog.organizationId),
					eq(AuditLog.archived, false),
					lt(AuditLog.createdAt, systemArchiveThreshold),
				),
			)
		totalArchived += systemArchiveResult.rowsAffected

		// Delete organization and system logs past retention period
		const deleteResult = await db
			.delete(AuditLog)
			.where(lt(AuditLog.retainUntil, now))
		totalDeleted += deleteResult.rowsAffected

		logger.info(
			{ archived: totalArchived, deleted: totalDeleted },
			'[Audit] Completed log archival and cleanup',
		)

		return { archived: totalArchived, deleted: totalDeleted }
	}
}

export const auditRetentionManager = new AuditRetentionManager()
