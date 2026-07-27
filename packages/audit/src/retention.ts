import { prisma } from '@repo/database'
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
			const policy = await prisma.auditLogRetentionPolicy.findUnique({
				where: { organizationId },
				select: { retentionDays: true },
			})
			if (policy) {
				retentionDays = policy.retentionDays
			}
		}

		const date = new Date()
		date.setDate(date.getDate() + retentionDays)
		return date
	}

	async getRetentionPolicy(organizationId: string) {
		const policy = await prisma.auditLogRetentionPolicy.findUnique({
			where: { organizationId },
		})

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
		return prisma.auditLogRetentionPolicy.upsert({
			where: { organizationId },
			create: {
				organizationId,
				retentionDays: data.retentionDays ?? 365,
				hotStorageDays: data.hotStorageDays ?? 90,
				archiveEnabled: data.archiveEnabled ?? true,
				exportEnabled: data.exportEnabled ?? true,
				complianceType: data.complianceType ?? null,
			},
			update: data,
		})
	}

	/**
	 * Single canonical implementation for audit log archival and retention cleanup (WO-35)
	 */
	async archiveOldLogs(): Promise<{ archived: number; deleted: number }> {
		const now = new Date()

		const policiesToProcess = await prisma.auditLogRetentionPolicy.findMany({
			where: { archiveEnabled: true },
			select: {
				organizationId: true,
				hotStorageDays: true,
				retentionDays: true,
			},
		})

		let totalArchived = 0
		let totalDeleted = 0

		for (const policy of policiesToProcess) {
			const archiveThreshold = new Date(now)
			archiveThreshold.setDate(
				archiveThreshold.getDate() - policy.hotStorageDays,
			)

			const archiveResult = await prisma.auditLog.updateMany({
				where: {
					organizationId: policy.organizationId,
					archived: false,
					createdAt: { lt: archiveThreshold },
				},
				data: { archived: true },
			})
			totalArchived += archiveResult.count
		}

		const deleteResult = await prisma.auditLog.deleteMany({
			where: {
				retainUntil: { lt: now },
			},
		})
		totalDeleted += deleteResult.count

		logger.info(
			{ archived: totalArchived, deleted: totalDeleted },
			'[Audit] Completed log archival and cleanup',
		)

		return { archived: totalArchived, deleted: totalDeleted }
	}
}

export const auditRetentionManager = new AuditRetentionManager()
