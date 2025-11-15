import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs } from 'react-router'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { auditService, AuditAction } from '#app/utils/audit.server.ts'

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
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, isBanned: true, name: true, username: true },
		})

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
		await prisma.user.update({
			where: { id: userId },
			data: {
				isBanned: true,
				banReason: reason.trim(),
				banExpiresAt,
				bannedAt: new Date(),
				bannedById: adminUserId,
			},
		})

		// Invalidate all user sessions to force logout
		await prisma.session.deleteMany({
			where: { userId },
		})

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
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, isBanned: true, name: true, username: true },
		})

		invariantResponse(user, 'User not found', { status: 404 })

		if (!user.isBanned) {
			return redirectWithToast(`/users/${userId}`, {
				type: 'error',
				title: 'User Not Banned',
				description: 'This user is not currently banned.',
			})
		}

		// Lift the ban
		await prisma.user.update({
			where: { id: userId },
			data: {
				isBanned: false,
				banReason: null,
				banExpiresAt: null,
				bannedAt: null,
				bannedById: null,
			},
		})

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
