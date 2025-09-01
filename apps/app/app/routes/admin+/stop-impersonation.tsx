import { data, redirect } from 'react-router'
import { sessionKey, getSessionExpirationDate } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'

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

	// Find the admin system organization for audit logging
	const adminOrg = await prisma.organization.findFirst({
		where: { slug: 'admin-system' },
		select: { id: true },
	})

	if (adminOrg) {
		// Create audit log entry as an organization note
		const auditNote = await prisma.organizationNote.create({
			data: {
				title: `Admin Impersonation Ended: ${targetName}`,
				content: `Admin stopped impersonating user ${targetName}`,
				isPublic: false,
				organizationId: adminOrg.id,
				createdById: adminUserId,
			},
			select: { id: true },
		})

		// Log the end of impersonation for audit purposes
		await prisma.noteActivityLog.create({
			data: {
				noteId: auditNote.id,
				userId: adminUserId,
				targetUserId: targetUserId,
				action: 'ADMIN_IMPERSONATION_END',
				metadata: JSON.stringify({
					adminId: adminUserId,
					targetUserId: targetUserId,
					targetName: targetName,
					endedAt: new Date().toISOString(),
					duration:
						Date.now() - new Date(impersonationInfo.startedAt).getTime(),
				}),
			},
		})
	}

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
	throw redirect('/admin/users', {
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
