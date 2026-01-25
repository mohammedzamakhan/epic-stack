import { invariantResponse } from '@epic-web/invariant'

import { authSessionStorage } from '@repo/auth'
import { redirectWithToast } from '@repo/common/toast'
import { prisma } from '@repo/database'
import { sessionKey } from '@repo/auth'

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

export async function deleteDataAction({ userId }: AccountActionArgs) {
	await prisma.user.delete({ where: { id: userId } })
	return redirectWithToast('/', {
		type: 'success',
		title: 'Data Deleted',
		description: 'All of your data has been deleted',
	})
}
