import { invariantResponse } from '@epic-web/invariant'
import { and, count, db, eq, Connection, Password } from '@repo/database'

type ConnectionsActionArgs = {
	formData: FormData
	userId: string
}

async function userCanDeleteConnections(userId: string) {
	const [password, connections] = await Promise.all([
		db
			.select({ userId: Password.userId })
			.from(Password)
			.where(eq(Password.userId, userId))
			.limit(1),
		db
			.select({ value: count() })
			.from(Connection)
			.where(eq(Connection.userId, userId)),
	])
	if (password[0]) return true
	return (connections[0]?.value ?? 0) > 1
}

export async function disconnectProviderAction({
	formData,
	userId,
}: ConnectionsActionArgs) {
	const connectionId = formData.get('connectionId')
	invariantResponse(
		typeof connectionId === 'string',
		'connectionId is required',
	)

	const canDelete = await userCanDeleteConnections(userId)
	invariantResponse(
		canDelete,
		'You cannot delete your last connection unless you have a password.',
	)

	await db
		.delete(Connection)
		.where(and(eq(Connection.id, connectionId), eq(Connection.userId, userId)))

	return Response.json({ status: 'success' })
}
