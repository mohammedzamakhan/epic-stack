import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '@repo/database'

type ConnectionsActionArgs = {
	formData: FormData
	userId: string
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

	await prisma.connection.delete({
		where: { id: connectionId, userId },
	})

	return Response.json({ status: 'success' })
}
