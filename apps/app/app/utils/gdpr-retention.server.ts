/**
 * GDPR Data Retention and Cleanup Service
 * Handles automatic deletion of data based on retention policies
 */

import { prisma } from './db.server.ts'

export interface RetentionPolicy {
	entityType: string
	retentionPeriodDays: number
	autoDeleteEnabled: boolean
	gracePeriodDays: number
}

/**
 * Default retention policies compliant with GDPR
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
	{
		entityType: 'session',
		retentionPeriodDays: 30, // Delete expired sessions after 30 days
		autoDeleteEnabled: true,
		gracePeriodDays: 0,
	},
	{
		entityType: 'refresh_token',
		retentionPeriodDays: 30, // Delete expired refresh tokens after 30 days
		autoDeleteEnabled: true,
		gracePeriodDays: 0,
	},
	{
		entityType: 'verification',
		retentionPeriodDays: 7, // Delete used verifications after 7 days
		autoDeleteEnabled: true,
		gracePeriodDays: 0,
	},
	{
		entityType: 'audit_log',
		retentionPeriodDays: 365, // Keep audit logs for 1 year
		autoDeleteEnabled: true,
		gracePeriodDays: 30,
	},
	{
		entityType: 'deleted_user',
		retentionPeriodDays: 30, // Permanently delete soft-deleted users after 30 days
		autoDeleteEnabled: true,
		gracePeriodDays: 0,
	},
	{
		entityType: 'integration_log',
		retentionPeriodDays: 90, // Keep integration logs for 90 days
		autoDeleteEnabled: true,
		gracePeriodDays: 0,
	},
	{
		entityType: 'ip_address_tracking',
		retentionPeriodDays: 180, // Keep IP tracking for 6 months
		autoDeleteEnabled: true,
		gracePeriodDays: 30,
	},
]

/**
 * Initialize default retention policies in database
 */
export async function initializeRetentionPolicies() {
	console.log('Initializing GDPR retention policies...')

	for (const policy of DEFAULT_RETENTION_POLICIES) {
		await prisma.dataRetentionPolicy.upsert({
			where: { entityType: policy.entityType },
			update: {},
			create: {
				entityType: policy.entityType,
				retentionPeriodDays: policy.retentionPeriodDays,
				autoDeleteEnabled: policy.autoDeleteEnabled,
				gracePeriodDays: policy.gracePeriodDays,
				description: `Default retention policy for ${policy.entityType}`,
			},
		})
	}

	console.log('✓ Retention policies initialized')
}

/**
 * Clean up expired sessions
 */
async function cleanupSessions() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'session' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	const result = await prisma.session.deleteMany({
		where: {
			expirationDate: { lt: cutoffDate },
		},
	})

	return result.count
}

/**
 * Clean up expired refresh tokens
 */
async function cleanupRefreshTokens() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'refresh_token' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	const result = await prisma.refreshToken.deleteMany({
		where: {
			OR: [
				{ expiresAt: { lt: cutoffDate } },
				{ revoked: true, updatedAt: { lt: cutoffDate } },
			],
		},
	})

	return result.count
}

/**
 * Clean up expired verifications
 */
async function cleanupVerifications() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'verification' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	const result = await prisma.verification.deleteMany({
		where: {
			OR: [
				{ expiresAt: { lt: new Date() } },
				{ expiresAt: null, createdAt: { lt: cutoffDate } },
			],
		},
	})

	return result.count
}

/**
 * Clean up old audit logs (archive or delete)
 */
async function cleanupAuditLogs() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'audit_log' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(
		cutoffDate.getDate() - (policy.retentionPeriodDays + policy.gracePeriodDays),
	)

	// First, archive logs that are old but within grace period
	const archiveCutoffDate = new Date()
	archiveCutoffDate.setDate(
		archiveCutoffDate.getDate() - policy.retentionPeriodDays,
	)

	await prisma.auditLog.updateMany({
		where: {
			createdAt: { lt: archiveCutoffDate, gte: cutoffDate },
			archived: false,
		},
		data: {
			archived: true,
		},
	})

	// Then delete logs older than retention + grace period
	const result = await prisma.auditLog.deleteMany({
		where: {
			createdAt: { lt: cutoffDate },
			retainUntil: { lt: new Date() },
		},
	})

	return result.count
}

/**
 * Permanently delete soft-deleted users
 */
async function cleanupDeletedUsers() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'deleted_user' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	// Find users marked for deletion that are past the grace period
	const usersToDelete = await prisma.user.findMany({
		where: {
			accountDeletedAt: { lt: cutoffDate },
			dataRetentionDate: { lt: new Date() },
		},
		select: { id: true, email: true, username: true },
	})

	let deletedCount = 0
	for (const user of usersToDelete) {
		try {
			// Log the permanent deletion
			await prisma.auditLog.create({
				data: {
					action: 'user_permanently_deleted',
					details: `User ${user.username} (${user.email}) permanently deleted after retention period`,
					severity: 'info',
					resourceType: 'user',
					resourceId: user.id,
				},
			})

			// Permanently delete the user (cascade will handle related data)
			await prisma.user.delete({
				where: { id: user.id },
			})

			deletedCount++
		} catch (error) {
			console.error(`Failed to delete user ${user.id}:`, error)
		}
	}

	return deletedCount
}

/**
 * Clean up old integration logs
 */
async function cleanupIntegrationLogs() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'integration_log' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	const result = await prisma.integrationLog.deleteMany({
		where: {
			createdAt: { lt: cutoffDate },
		},
	})

	return result.count
}

/**
 * Clean up old IP address tracking data
 */
async function cleanupIpAddressTracking() {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'ip_address_tracking' },
	})

	if (!policy?.autoDeleteEnabled) return 0

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays)

	// Delete old IP address user associations
	const ipUserResult = await prisma.ipAddressUser.deleteMany({
		where: {
			lastSeenAt: { lt: cutoffDate },
		},
	})

	// Delete IP addresses with no recent activity and no users
	const ipResult = await prisma.ipAddress.deleteMany({
		where: {
			lastRequestAt: { lt: cutoffDate },
			isBlacklisted: false,
			ipAddressUsers: { none: {} },
		},
	})

	return ipUserResult.count + ipResult.count
}

/**
 * Run all cleanup tasks
 */
export async function runDataRetentionCleanup() {
	console.log('Starting GDPR data retention cleanup...')

	const results = {
		sessions: 0,
		refreshTokens: 0,
		verifications: 0,
		auditLogs: 0,
		deletedUsers: 0,
		integrationLogs: 0,
		ipTracking: 0,
	}

	try {
		results.sessions = await cleanupSessions()
		console.log(`✓ Cleaned up ${results.sessions} expired sessions`)

		results.refreshTokens = await cleanupRefreshTokens()
		console.log(`✓ Cleaned up ${results.refreshTokens} expired refresh tokens`)

		results.verifications = await cleanupVerifications()
		console.log(`✓ Cleaned up ${results.verifications} expired verifications`)

		results.auditLogs = await cleanupAuditLogs()
		console.log(`✓ Cleaned up ${results.auditLogs} old audit logs`)

		results.deletedUsers = await cleanupDeletedUsers()
		console.log(
			`✓ Permanently deleted ${results.deletedUsers} users past retention period`,
		)

		results.integrationLogs = await cleanupIntegrationLogs()
		console.log(
			`✓ Cleaned up ${results.integrationLogs} old integration logs`,
		)

		results.ipTracking = await cleanupIpAddressTracking()
		console.log(`✓ Cleaned up ${results.ipTracking} old IP tracking records`)

		// Update last processed timestamp for all policies
		await prisma.dataRetentionPolicy.updateMany({
			where: { autoDeleteEnabled: true },
			data: { lastProcessedAt: new Date() },
		})

		console.log('✓ Data retention cleanup completed')
		return results
	} catch (error) {
		console.error('Error during data retention cleanup:', error)
		throw error
	}
}

/**
 * Soft delete a user account (GDPR Right to Erasure)
 * Sets a deletion date and retains for grace period before permanent deletion
 */
export async function softDeleteUser(
	userId: string,
	reason: string = 'user_requested',
) {
	const policy = await prisma.dataRetentionPolicy.findUnique({
		where: { entityType: 'deleted_user' },
	})

	const gracePeriodDays = policy?.gracePeriodDays ?? 30
	const dataRetentionDate = new Date()
	dataRetentionDate.setDate(dataRetentionDate.getDate() + gracePeriodDays)

	await prisma.user.update({
		where: { id: userId },
		data: {
			accountDeletedAt: new Date(),
			dataRetentionDate,
			// Revoke all consent
			privacyConsent: false,
			marketingConsent: false,
			analyticsConsent: false,
			dataProcessingConsent: false,
		},
	})

	// Revoke all sessions
	await prisma.session.deleteMany({
		where: { userId },
	})

	// Revoke all refresh tokens
	await prisma.refreshToken.updateMany({
		where: { userId },
		data: { revoked: true },
	})

	// Log the deletion request
	await prisma.auditLog.create({
		data: {
			userId,
			action: 'user_deletion_requested',
			details: `User requested account deletion. Reason: ${reason}. Data will be permanently deleted after ${gracePeriodDays} days.`,
			severity: 'info',
			resourceType: 'user',
			resourceId: userId,
		},
	})

	return {
		deletionDate: new Date(),
		permanentDeletionDate: dataRetentionDate,
		gracePeriodDays,
	}
}
