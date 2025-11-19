import { invariantResponse } from '@epic-web/invariant'

import { sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

type AccountActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

export async function signOutOfSessionsAction({
	request,
	userId,
}: AccountActionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	invariantResponse(
		sessionId,
		'You must be authenticated to sign out of other sessions',
	)
	await prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	})
	return Response.json({ status: 'success' })
}

export async function deleteDataAction({ userId, request }: AccountActionArgs) {
	// Import soft delete function
	const { softDeleteUser } = await import(
		'#app/utils/gdpr-retention.server.ts'
	)

	// Soft delete with 30-day grace period (GDPR compliant)
	const result = await softDeleteUser(userId, 'user_requested')

	// Log the action with IP and user agent for audit
	await prisma.auditLog.create({
		data: {
			userId,
			action: 'account_deletion_requested',
			details: `User requested account deletion. Data will be permanently deleted on ${result.permanentDeletionDate.toLocaleDateString()}`,
			ipAddress: request.headers.get('x-forwarded-for') || undefined,
			userAgent: request.headers.get('user-agent') || undefined,
			resourceType: 'user',
			resourceId: userId,
			severity: 'warning',
		},
	})

	return redirectWithToast('/', {
		type: 'success',
		title: 'Account Deletion Scheduled',
		description: `Your account will be permanently deleted in ${result.gracePeriodDays} days. Contact support if you change your mind.`,
	})
}
