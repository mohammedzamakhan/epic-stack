import { type LoaderFunctionArgs } from 'react-router'
import { prisma } from '@repo/database'

export async function loader({ request }: LoaderFunctionArgs) {
	// Find the user and org
	const user = await prisma.user.findUnique({
		where: { username: 'geoffrey_halvorson64' },
	})

	const org = await prisma.organization.findUnique({
		where: { slug: 'acme' },
	})

	if (!user || !org) {
		return Response.json(
			{ error: 'User or org not found', user: !!user, org: !!org },
			{ status: 404 },
		)
	}

	// Create a new test notification
	const notification = await prisma.notification.create({
		data: {
			userId: user.id,
			organizationId: org.id,
			type: 'mention',
			entityId: `test-mention-${Date.now()}`,
			payload: JSON.stringify({
				noteTitle: 'Test Note',
				commenterName: 'Test System',
				commentContent: 'This is a test notification generated from the API.',
				noteUrl: '/notes/test',
			}),
		},
	})

	return Response.json({ success: true, notification })
}
