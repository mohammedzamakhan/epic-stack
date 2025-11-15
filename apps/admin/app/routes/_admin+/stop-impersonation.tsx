import { data, redirect } from 'react-router'
import { sessionKey, getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import { auditService, AuditAction } from '#app/utils/audit.server.ts'

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
