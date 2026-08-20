import { invariantResponse } from '@epic-web/invariant'
import { auditService, AuditAction } from '@repo/audit'
import { requireUserWithRole } from '@repo/auth'
import { redirectWithToast } from '@repo/common/toast'
import { Session, User, db, eq } from '@repo/database'
import { type ActionFunctionArgs } from 'react-router'
import { revokeAllRefreshTokens } from '#app/utils/jwt.server.ts'

export async function action({ request, params }: ActionFunctionArgs) {
	const adminUserId = await requireUserWithRole(request, 'admin')

	const { userId } = params
	invariantResponse(userId, 'User ID is required')

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'ban') {
		const reason = formData.get('reason')
		const expiresAt = formData.get('expiresAt')

		invariantResponse(
			typeof reason === 'string' && reason.trim(),
			'Ban reason is required',
		)

		// Check if user exists and is not already banned
		const [user] = await db
			.select({
				id: User.id,
				isBanned: User.isBanned,
				name: User.name,
				username: User.username,
			})
			.from(User)
			.where(eq(User.id, userId))
			.limit(1)

		invariantResponse(user, 'User not found', { status: 404 })

		if (user.isBanned) {
			return redirectWithToast(`/users/${userId}`, {
				type: 'error',
				title: 'User Already Banned',
				description: 'This user is already banned.',
			})
		}

		// Parse expiration date if provided
		let banExpiresAt: Date | null = null
		if (typeof expiresAt === 'string' && expiresAt.trim()) {
			banExpiresAt = new Date(expiresAt)

			// Validate expiration date is in the future
			if (banExpiresAt <= new Date()) {
				return redirectWithToast(`/users/${userId}`, {
					type: 'error',
					title: 'Invalid Expiration Date',
					description: 'Ban expiration date must be in the future.',
				})
			}
		}

		// Ban the user
		await db
			.update(User)
			.set({
				isBanned: true,
				banReason: reason.trim(),
				banExpiresAt,
				bannedAt: new Date(),
				bannedById: adminUserId,
			})
			.where(eq(User.id, userId))

		// Invalidate all user sessions to force logout
		await db.delete(Session).where(eq(Session.userId, userId))

		// Revoke all mobile refresh tokens
		await revokeAllRefreshTokens(userId)

		// Log the ban action
		await auditService.logUserManagement(
			AuditAction.USER_BANNED,
			adminUserId,
			userId,
			undefined,
			`User banned: ${user.name || user.username}`,
			{
				reason: reason.trim(),
				expiresAt: banExpiresAt?.toISOString(),
				isPermanent: !banExpiresAt,
			},
			request,
		)

		return redirectWithToast(`/users/${userId}`, {
			type: 'success',
			title: 'User Banned',
			description: `${user.name || user.username} has been banned successfully.`,
		})
	}

	if (intent === 'lift-ban') {
		// Check if user exists and is banned
		const [user] = await db
			.select({
				id: User.id,
				isBanned: User.isBanned,
				name: User.name,
				username: User.username,
			})
			.from(User)
			.where(eq(User.id, userId))
			.limit(1)

		invariantResponse(user, 'User not found', { status: 404 })

		if (!user.isBanned) {
			return redirectWithToast(`/users/${userId}`, {
				type: 'error',
				title: 'User Not Banned',
				description: 'This user is not currently banned.',
			})
		}

		// Lift the ban
		await db
			.update(User)
			.set({
				isBanned: false,
				banReason: null,
				banExpiresAt: null,
				bannedAt: null,
				bannedById: null,
			})
			.where(eq(User.id, userId))

		// Log the unban action
		await auditService.logUserManagement(
			AuditAction.USER_UNBANNED,
			adminUserId,
			userId,
			undefined,
			`Ban lifted for user: ${user.name || user.username}`,
			{},
			request,
		)

		return redirectWithToast(`/users/${userId}`, {
			type: 'success',
			title: 'Ban Lifted',
			description: `Ban has been lifted for ${user.name || user.username}.`,
		})
	}

	invariantResponse(false, 'Invalid intent', { status: 400 })
}
