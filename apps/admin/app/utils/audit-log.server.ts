import {
	AuditLog,
	Organization,
	User,
	and,
	db,
	desc,
	eq,
	inArray,
} from '@repo/database'

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
		await db.insert(AuditLog).values({
			organizationId: input.organizationId,
			userId: input.userId,
			action: input.action,
			details: input.details,
			metadata: input.metadata ? JSON.stringify(input.metadata) : null,
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

		const logs = await db
			.select({
				id: AuditLog.id,
				organizationId: AuditLog.organizationId,
				userId: AuditLog.userId,
				action: AuditLog.action,
				details: AuditLog.details,
				metadata: AuditLog.metadata,
				createdAt: AuditLog.createdAt,
				user: { id: User.id, name: User.name, username: User.username },
			})
			.from(AuditLog)
			.leftJoin(User, eq(AuditLog.userId, User.id))
			.where(
				and(
					eq(AuditLog.organizationId, organizationId),
					actions?.length ? inArray(AuditLog.action, actions) : undefined,
				),
			)
			.orderBy(desc(AuditLog.createdAt))
			.limit(limit)
			.offset(offset)
		return logs
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

		return await db
			.select({
				id: AuditLog.id,
				organizationId: AuditLog.organizationId,
				userId: AuditLog.userId,
				action: AuditLog.action,
				details: AuditLog.details,
				metadata: AuditLog.metadata,
				createdAt: AuditLog.createdAt,
				organization: {
					id: Organization.id,
					name: Organization.name,
					slug: Organization.slug,
				},
			})
			.from(AuditLog)
			.leftJoin(Organization, eq(AuditLog.organizationId, Organization.id))
			.where(
				and(
					eq(AuditLog.userId, userId),
					organizationId
						? eq(AuditLog.organizationId, organizationId)
						: undefined,
				),
			)
			.orderBy(desc(AuditLog.createdAt))
			.limit(limit)
			.offset(offset)
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

		return await db
			.select({
				id: AuditLog.id,
				organizationId: AuditLog.organizationId,
				userId: AuditLog.userId,
				action: AuditLog.action,
				details: AuditLog.details,
				metadata: AuditLog.metadata,
				createdAt: AuditLog.createdAt,
				user: { id: User.id, name: User.name, username: User.username },
				organization: {
					id: Organization.id,
					name: Organization.name,
					slug: Organization.slug,
				},
			})
			.from(AuditLog)
			.leftJoin(User, eq(AuditLog.userId, User.id))
			.leftJoin(Organization, eq(AuditLog.organizationId, Organization.id))
			.where(
				and(
					eq(AuditLog.action, action),
					organizationId
						? eq(AuditLog.organizationId, organizationId)
						: undefined,
				),
			)
			.orderBy(desc(AuditLog.createdAt))
			.limit(limit)
			.offset(offset)
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
