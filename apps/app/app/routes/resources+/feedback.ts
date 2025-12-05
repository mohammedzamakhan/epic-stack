import { prisma } from '@repo/database'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'

const FeedbackSchema = z.object({
	message: z.string().min(1).max(5000, 'Feedback message is too long'),
	type: z.enum(['positive', 'neutral', 'negative']),
})

export async function action({ request }: { request: Request }) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const result = FeedbackSchema.safeParse(Object.fromEntries(formData))

	if (!result.success) {
		return Response.json(
			{ status: 'error', errors: result.error.flatten() },
			{ status: 400 },
		)
	}

	const { message, type } = result.data

	const userOrganization = await prisma.userOrganization.findFirst({
		where: {
			userId,
			isDefault: true,
		},
	})

	if (!userOrganization) {
		return Response.json(
			{ status: 'error', message: 'Default organization not found' },
			{ status: 400 },
		)
	}

	await prisma.feedback.create({
		data: {
			message,
			type: type.toUpperCase(),
			userId,
			organizationId: userOrganization.organizationId,
		},
	})

	return Response.json({ status: 'success' })
}
