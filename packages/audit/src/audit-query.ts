import { prisma } from '@repo/database'
import { AuditAction } from './actions.ts'

export interface AuditQueryFilter {
	organizationId?: string
	userId?: string
	targetUserId?: string
	action?: AuditAction | AuditAction[]
	severity?: 'info' | 'warning' | 'error' | 'critical'
	resourceType?: string
	resourceId?: string
	startDate?: Date
	endDate?: Date
	search?: string
	includeArchived?: boolean
	limit?: number
	offset?: number
	sortBy?: 'createdAt' | 'action' | 'severity'
	sortOrder?: 'asc' | 'desc'
}

export class AuditLogQuery {
	async query(filter: AuditQueryFilter) {
		const where: any = {}

		if (filter.organizationId !== undefined) {
			where.organizationId = filter.organizationId
		}

		if (filter.userId) {
			where.userId = filter.userId
		}

		if (filter.targetUserId) {
			where.targetUserId = filter.targetUserId
		}

		if (filter.action) {
			if (Array.isArray(filter.action)) {
				where.action = { in: filter.action }
			} else {
				where.action = filter.action
			}
		}

		if (filter.severity) {
			where.severity = filter.severity
		}

		if (filter.resourceType) {
			where.resourceType = filter.resourceType
		}

		if (filter.resourceId) {
			where.resourceId = filter.resourceId
		}

		if (filter.startDate || filter.endDate) {
			where.createdAt = {}
			if (filter.startDate) where.createdAt.gte = filter.startDate
			if (filter.endDate) where.createdAt.lte = filter.endDate
		}

		if (filter.search) {
			where.OR = [
				{ details: { contains: filter.search } },
				{ action: { contains: filter.search } },
			]
		}

		if (!filter.includeArchived) {
			where.archived = false
		}

		const take = Math.min(filter.limit || 50, 500)
		const skip = filter.offset || 0
		const orderBy = {
			[filter.sortBy || 'createdAt']: filter.sortOrder || 'desc',
		}

		const [logs, totalCount] = await Promise.all([
			prisma.auditLog.findMany({
				where,
				take,
				skip,
				orderBy,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							username: true,
						},
					},
				},
			}),
			prisma.auditLog.count({ where }),
		])

		return {
			logs: logs.map((log) => ({
				...log,
				metadata: log.metadata ? (JSON.parse(log.metadata) as any) : null,
			})),
			totalCount,
			hasMore: skip + logs.length < totalCount,
		}
	}

	async exportCSV(filter: AuditQueryFilter): Promise<string> {
		const { logs } = await this.query({ ...filter, limit: 10000 })

		const headers = [
			'Timestamp',
			'ID',
			'Action',
			'Severity',
			'User ID',
			'User Name',
			'User Email',
			'Target User ID',
			'Organization ID',
			'Resource Type',
			'Resource ID',
			'Details',
			'IP Address',
			'User Agent',
		]

		const rows = logs.map((log) => [
			log.createdAt.toISOString(),
			log.id,
			log.action,
			log.severity,
			log.userId || '',
			log.user?.name || '',
			log.user?.email || '',
			log.targetUserId || '',
			log.organizationId || '',
			log.resourceType || '',
			log.resourceId || '',
			this.escapeCsvValue(log.details),
			log.ipAddress || '',
			this.escapeCsvValue(log.userAgent || ''),
		])

		return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
	}

	async exportJSON(filter: AuditQueryFilter): Promise<string> {
		const { logs } = await this.query({ ...filter, limit: 10000 })
		return JSON.stringify(logs, null, 2)
	}

	async getStatistics(organizationId?: string, days: number = 30) {
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - days)

		const where: any = { createdAt: { gte: startDate } }
		if (organizationId !== undefined) {
			where.organizationId = organizationId
		}

		const [
			totalLogs,
			severityCounts,
			actionCounts,
			topUsers,
			unusualActivityCount,
		] = await Promise.all([
			prisma.auditLog.count({ where }),
			prisma.auditLog.groupBy({
				by: ['severity'],
				where,
				_count: true,
			}),
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
				take: 5,
			}),
			prisma.auditLog.count({
				where: {
					...where,
					severity: { in: ['warning', 'error', 'critical'] },
				},
			}),
		])

		return {
			periodDays: days,
			totalEvents: totalLogs,
			totalLogs,
			severityBreakdown: Object.fromEntries(
				severityCounts.map((s) => [s.severity, s._count]),
			),
			topActions: actionCounts.map((a) => ({
				action: a.action,
				count: a._count,
				_count: a._count,
			})),
			topUserIds: topUsers.map((u) => ({
				userId: u.userId,
				count: u._count,
				_count: u._count,
			})),
			unusualActivityCount,
			recentSecurityEvents: [],
		}
	}

	private escapeCsvValue(val: string): string {
		if (!val) return '""'
		const sanitized = val.replace(/"/g, '""')
		return `"${sanitized}"`
	}
}

export const auditQuery = new AuditLogQuery()
