import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { checkHoneypot } from '@repo/security'

import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const organizationId = url.searchParams.get('organizationId')

	if (!organizationId) {
		return Response.json({ preferences: [] }, { status: 400 })
	}

	const preferences = await prisma.notificationPreference.findMany({
		where: {
			userId,
			organizationId,
		},
	})

	return Response.json({ preferences })
}

const preferenceSchema = z.object({
	organizationId: z.string().min(1),
	workflow: z.enum(['comment-mention-workflow', 'note-comment-workflow']),
	channel: z.enum(['email', 'inApp']),
	enabled: z.string().transform((val) => val === 'true'),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const formData = await request.formData()
	await checkHoneypot(formData)

	const result = preferenceSchema.safeParse(Object.fromEntries(formData))

	if (!result.success) {
		return Response.json(
			{ success: false, error: 'Invalid input' },
			{ status: 400 },
		)
	}

	const { organizationId, workflow, channel, enabled } = result.data

	// Verify org membership
	await userHasOrgAccess(request, organizationId)

	// upsert
	await prisma.notificationPreference.upsert({
		where: {
			userId_organizationId_workflow: {
				userId,
				organizationId,
				workflow,
			},
		},
		create: {
			userId,
			organizationId,
			workflow,
			[channel]: enabled,
		},
		update: {
			[channel]: enabled,
		},
	})

	// Return updated preferences so the fetcher data stays populated
	const preferences = await prisma.notificationPreference.findMany({
		where: { userId, organizationId },
	})

	return Response.json({ success: true, preferences })
}
