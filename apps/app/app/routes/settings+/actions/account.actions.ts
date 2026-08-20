import { invariantResponse } from '@epic-web/invariant'

import { authSessionStorage, sessionKey } from '@repo/auth'
import { and, db, eq, ne, Session } from '@repo/database'

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
	await db
		.delete(Session)
		.where(and(eq(Session.userId, userId), ne(Session.id, sessionId)))
	return Response.json({ status: 'success' })
}
