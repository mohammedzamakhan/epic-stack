import { prisma } from '@repo/database'

export interface CreateAuditLogInput {
	organizationId?: string
	userId?: string
	action: string
	details: string
	metadata?: Record<string, any>
}

export class AuditLogService {
	/**
	 * Create a new audit log entry
	 */
	async createLog(input: CreateAuditLogInput): Promise<void> {
		await prisma.auditLog.create({
			data: {
				organizationId: input.organizationId,
				userId: input.userId,
				action: input.action,
				details: input.details,
				metadata: input.metadata ? JSON.stringify(input.metadata) : null,
			},
		})
	}

	/**
	 * Get audit logs for an organization
	 */
	async getOrganizationLogs(
		organizationId: string,
		options: {
			limit?: number
			offset?: number
			actions?: string[]
		} = {},
	) {
		const { limit = 50, offset = 0, actions } = options

		return prisma.auditLog.findMany({
			where: {
				organizationId,
				...(actions && { action: { in: actions } }),
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						username: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: limit,
			skip: offset,
		})
	}

	/**
	 * Get audit logs for a specific user
	 */
	async getUserLogs(
		userId: string,
		options: {
			limit?: number
			offset?: number
			organizationId?: string
		} = {},
	) {
		const { limit = 50, offset = 0, organizationId } = options

		return prisma.auditLog.findMany({
			where: {
				userId,
				...(organizationId && { organizationId }),
			},
			include: {
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			take: limit,
			skip: offset,
		})
	}

	/**
	 * Get audit logs by action type
	 */
	async getLogsByAction(
		action: string,
		options: {
			limit?: number
			offset?: number
			organizationId?: string
		} = {},
	) {
		const { limit = 50, offset = 0, organizationId } = options

		return prisma.auditLog.findMany({
			where: {
				action,
				...(organizationId && { organizationId }),
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						username: true,
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
			orderBy: {
				createdAt: 'desc',
			},
			take: limit,
			skip: offset,
		})
	}

	/**
	 * Log SSO configuration changes
	 */
	async logSSOConfigChange(
		organizationId: string,
		userId: string,
		action: 'created' | 'updated' | 'enabled' | 'disabled' | 'deleted',
		metadata?: Record<string, any>,
	): Promise<void> {
		const actionMap = {
			created: 'sso_config_created',
			updated: 'sso_config_updated',
			enabled: 'sso_config_enabled',
			disabled: 'sso_config_disabled',
			deleted: 'sso_config_deleted',
		}

		const detailsMap = {
			created: 'SSO configuration created',
			updated: 'SSO configuration updated',
			enabled: 'SSO configuration enabled',
			disabled: 'SSO configuration disabled',
			deleted: 'SSO configuration deleted',
		}

		await this.createLog({
			organizationId,
			userId,
			action: actionMap[action],
			details: detailsMap[action],
			metadata,
		})
	}

	/**
	 * Log SSO authentication events
	 */
	async logSSOAuth(
		organizationId: string,
		userId: string,
		action: 'login' | 'logout' | 'login_failed',
		metadata?: Record<string, any>,
	): Promise<void> {
		const actionMap = {
			login: 'sso_login',
			logout: 'sso_logout',
			login_failed: 'sso_login_failed',
		}

		const detailsMap = {
			login: 'User logged in via SSO',
			logout: 'User logged out via SSO',
			login_failed: 'SSO login failed',
		}

		await this.createLog({
			organizationId,
			userId,
			action: actionMap[action],
			details: detailsMap[action],
			metadata,
		})
	}

	/**
	 * Log SSO user management events
	 */
	async logSSOUserManagement(
		organizationId: string,
		adminUserId: string,
		targetUserId: string,
		action: 'role_changed' | 'activated' | 'deactivated' | 'provisioned',
		metadata?: Record<string, any>,
	): Promise<void> {
		const actionMap = {
			role_changed: 'sso_user_role_changed',
			activated: 'sso_user_activated',
			deactivated: 'sso_user_deactivated',
			provisioned: 'sso_user_provisioned',
		}

		const detailsMap = {
			role_changed: 'SSO user role changed',
			activated: 'SSO user activated',
			deactivated: 'SSO user deactivated',
			provisioned: 'SSO user provisioned',
		}

		await this.createLog({
			organizationId,
			userId: adminUserId,
			action: actionMap[action],
			details: detailsMap[action],
			metadata: {
				...metadata,
				targetUserId,
			},
		})
	}
}

// Export singleton instance
export const auditLogService = new AuditLogService()
