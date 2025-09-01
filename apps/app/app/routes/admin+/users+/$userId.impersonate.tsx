import { invariantResponse } from '@epic-web/invariant'
import { data, redirect } from 'react-router'
import { sessionKey, getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'

export async function action({
	request,
	params,
}: {
	request: Request
	params: { userId: string }
}) {
	const adminUserId = await requireUserWithRole(request, 'admin')
	const { userId } = params
	invariantResponse(userId, 'User ID is required')

	// Get the target user to impersonate
	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			isBanned: true,
			banExpiresAt: true,
		},
	})

	invariantResponse(targetUser, 'User not found', { status: 404 })

	// Check if user is banned and ban hasn't expired
	if (targetUser.isBanned) {
		const now = new Date()
		const banExpired =
			targetUser.banExpiresAt && new Date(targetUser.banExpiresAt) <= now

		if (!banExpired) {
			throw data(
				{ error: 'Cannot impersonate banned user' },
				{
					status: 400,
					headers: await createToastHeaders({
						type: 'error',
						title: 'Impersonation Failed',
						description: 'Cannot impersonate a banned user.',
					}),
				},
			)
		}
	}

	// Get admin user info for audit logging
	const adminUser = await prisma.user.findUnique({
		where: { id: adminUserId },
		select: {
			id: true,
			name: true,
			username: true,
		},
	})

	invariantResponse(adminUser, 'Admin user not found')

	// Create a new session for the target user
	const impersonationSession = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: targetUser.id,
		},
		select: { id: true, expirationDate: true, userId: true },
	})

	// Create a temporary organization note for audit logging
	// This is a workaround since we don't have a dedicated admin audit log table
	const adminOrg = await prisma.organization.findFirst({
		where: { slug: 'admin-system' },
		select: { id: true },
	})

	let auditOrgId = adminOrg?.id
	if (!auditOrgId) {
		// Create admin system organization if it doesn't exist
		const createdAdminOrg = await prisma.organization.create({
			data: {
				name: 'Admin System',
				slug: 'admin-system',
				description: 'System organization for admin audit logs',
				active: false, // Hidden from normal users
			},
			select: { id: true },
		})
		auditOrgId = createdAdminOrg.id
	}

	// Create audit log entry as an organization note
	const auditNote = await prisma.organizationNote.create({
		data: {
			title: `Admin Impersonation: ${targetUser.name || targetUser.username}`,
			content: `Admin ${adminUser.name || adminUser.username} started impersonating user ${targetUser.name || targetUser.username} (${targetUser.email})`,
			isPublic: false,
			organizationId: auditOrgId,
			createdById: adminUserId,
		},
		select: { id: true },
	})

	// Log the impersonation action for audit purposes
	await prisma.noteActivityLog.create({
		data: {
			noteId: auditNote.id,
			userId: adminUserId,
			targetUserId: targetUser.id,
			action: 'ADMIN_IMPERSONATION_START',
			metadata: JSON.stringify({
				adminId: adminUserId,
				adminName: adminUser.name || adminUser.username,
				targetUserId: targetUser.id,
				targetName: targetUser.name || targetUser.username,
				targetEmail: targetUser.email,
				timestamp: new Date().toISOString(),
				sessionId: impersonationSession.id,
			}),
		},
	})

	// Get current session to store admin info
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)

	// Store impersonation info in session
	authSession.set(sessionKey, impersonationSession.id)
	authSession.set('impersonating', {
		adminUserId: adminUserId,
		adminName: adminUser.name || adminUser.username,
		targetUserId: targetUser.id,
		targetName: targetUser.name || targetUser.username,
		startedAt: new Date().toISOString(),
	})

	// Redirect to main app as the impersonated user
	throw redirect('/', {
		headers: {
			'set-cookie': await authSessionStorage.commitSession(authSession),
			...(await createToastHeaders({
				type: 'success',
				title: 'Impersonation Started',
				description: `Now impersonating ${targetUser.name || targetUser.username}`,
			})),
		},
	})
}
