import { auditService, AuditAction } from '@repo/audit'
import {
	impersonationSessionStorage,
	impersonationSessionKey,
	destroyImpersonationSession,
} from '@repo/auth'
import { createToastHeaders } from '@repo/common/toast'
import { prisma } from '@repo/database'
import { data, redirect } from 'react-router'

export async function action({ request }: { request: Request }) {
	const impSession = await impersonationSessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const impersonationSessionId = impSession.get(impersonationSessionKey)

	if (!impersonationSessionId) {
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

	// Get impersonation session details for audit logging
	const impersonationSession = await prisma.impersonationSession.findUnique({
		where: { id: impersonationSessionId },
		include: {
			adminUser: { select: { id: true, name: true, username: true } },
			targetUser: { select: { id: true, name: true, username: true } },
		},
	})

	let adminUserId: string
	let targetName: string
	let targetUserId: string
	let duration: number

	if (impersonationSession) {
		adminUserId = impersonationSession.adminUserId
		targetUserId = impersonationSession.targetUserId
		targetName =
			impersonationSession.targetUser.name ||
			impersonationSession.targetUser.username
		duration = Date.now() - impersonationSession.createdAt.getTime()

		// Delete the impersonation session from database
		await prisma.impersonationSession
			.delete({ where: { id: impersonationSessionId } })
			.catch(() => {
				// Session may already be deleted, ignore errors
			})
	} else {
		// Session not found in DB (expired/deleted), still clear cookie
		throw redirect('/users', {
			headers: {
				'set-cookie': await destroyImpersonationSession(request),
				...(await createToastHeaders({
					type: 'message',
					title: 'Session Expired',
					description: 'Impersonation session had already expired.',
				})),
			},
		})
	}

	const durationMinutes = Math.floor(duration / 1000 / 60)

	// Log the end of impersonation using the audit service
	await auditService.logAdminOperation(
		AuditAction.ADMIN_IMPERSONATION_END,
		adminUserId,
		`Stopped impersonating user: ${targetName}`,
		{
			adminId: adminUserId,
			targetUserId,
			targetName,
			duration,
			durationMinutes,
			impersonationSessionId,
		},
		request,
	)

	// Destroy impersonation cookie and redirect back to admin dashboard
	throw redirect('/users', {
		headers: {
			'set-cookie': await destroyImpersonationSession(request),
			...(await createToastHeaders({
				type: 'success',
				title: 'Impersonation Ended',
				description: `Stopped impersonating ${targetName}`,
			})),
		},
	})
}
