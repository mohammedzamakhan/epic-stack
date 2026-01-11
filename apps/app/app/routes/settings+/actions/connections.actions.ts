import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '@repo/database'

type ConnectionsActionArgs = {
	formData: FormData
	userId: string
}

async function userCanDeleteConnections(userId: string) {
	const user = await prisma.user.findUnique({
		select: {
			password: { select: { userId: true } },
			_count: { select: { connections: true } },
		},
		where: { id: userId },
	})
	if (user?.password) return true
	return Boolean(user?._count.connections && user?._count.connections > 1)
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

	await prisma.connection.delete({
		where: { id: connectionId, userId },
	})

	return Response.json({ status: 'success' })
}
