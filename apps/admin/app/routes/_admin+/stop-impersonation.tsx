import { auditService, AuditAction } from '@repo/audit'
import {
	authSessionStorage,
	sessionKey,
	getSessionExpirationDate,
} from '@repo/auth'
import { createToastHeaders } from '@repo/common/toast'
import { prisma } from '@repo/database'
import { data, redirect } from 'react-router'

export async function action({ request }: { request: Request }) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const impersonationInfo = authSession.get('impersonating')

	if (!impersonationInfo) {
		throw data(
			{ error: 'Not currently impersonating' },
			{
				status: 400,
				headers: await createToastHeaders({
					type: 'error',
					title: 'Error',
					description: 'Not currently impersonating a user.',
				}),
			},
		)
	}

	const { adminUserId, targetUserId, targetName } = impersonationInfo

	// Get the current impersonation session ID to delete it
	const impersonationSessionId = authSession.get(sessionKey)

	// Delete the orphaned impersonation session from the database
	if (impersonationSessionId) {
		await prisma.session
			.delete({
				where: { id: impersonationSessionId },
			})
			.catch(() => {
				// Session may already be expired/deleted, ignore errors
			})
	}

	// Calculate impersonation duration
	const duration = Date.now() - new Date(impersonationInfo.startedAt).getTime()
	const durationMinutes = Math.floor(duration / 1000 / 60)

	// Log the end of impersonation using the audit service
	await auditService.logAdminOperation(
		AuditAction.ADMIN_IMPERSONATION_END,
		adminUserId,
		`Stopped impersonating user: ${targetName}`,
		{
			adminId: adminUserId,
			targetUserId: targetUserId,
			targetName: targetName,
			duration,
			durationMinutes,
		},
		request,
	)

	// Create a new session for the admin user
	const adminSession = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: adminUserId,
		},
		select: { id: true },
	})

	// Clear impersonation info and set admin session
	authSession.set(sessionKey, adminSession.id)
	authSession.unset('impersonating')

	// Redirect back to admin dashboard
	throw redirect('/users', {
		headers: {
			'set-cookie': await authSessionStorage.commitSession(authSession),
			...(await createToastHeaders({
				type: 'success',
				title: 'Impersonation Ended',
				description: `Stopped impersonating ${targetName}`,
			})),
		},
	})
}
