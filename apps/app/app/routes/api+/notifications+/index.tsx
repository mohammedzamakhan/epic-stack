import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { checkHoneypot } from '@repo/security'

import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const takeParam = Number(url.searchParams.get('take') || '50')
	const take = Number.isNaN(takeParam)
		? 50
		: Math.min(100, Math.max(1, takeParam))

	const orgSlug = url.searchParams.get('orgSlug')

	let organizationId: string | undefined
	if (orgSlug) {
		const org = await prisma.organization.findUnique({
			where: { slug: orgSlug },
			select: { id: true },
		})
		if (org) organizationId = org.id
	}

	const whereClause = {
		userId,
		...(organizationId ? { organizationId } : {}),
	}

	const notifications = await prisma.notification.findMany({
		where: whereClause,
		orderBy: { createdAt: 'desc' },
		take,
	})

	const unreadCount = await prisma.notification.count({
		where: { ...whereClause, isRead: false },
	})

	return Response.json({ notifications, unreadCount })
}

const actionSchema = z.discriminatedUnion('intent', [
	z.object({
		intent: z.literal('markAsRead'),
		notificationId: z.string(),
		orgSlug: z.string().optional(),
	}),
	z.object({
		intent: z.literal('markAllAsRead'),
		orgSlug: z.string().optional(),
	}),
])

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	await checkHoneypot(formData)

	const result = actionSchema.safeParse(Object.fromEntries(formData))

	if (!result.success) {
		return Response.json({ error: result.error.message }, { status: 400 })
	}

	const data = result.data

	switch (data.intent) {
		case 'markAsRead': {
			let organizationId: string | undefined
			if (data.orgSlug) {
				const org = await prisma.organization.findUnique({
					where: { slug: data.orgSlug },
					select: { id: true },
				})
				if (org) organizationId = org.id
			}
			await prisma.notification.updateMany({
				where: {
					id: data.notificationId,
					userId,
					...(organizationId ? { organizationId } : {}),
				},
				data: { isRead: true, isSeen: true },
			})
			return Response.json({ success: true })
		}
		case 'markAllAsRead': {
			let organizationId: string | undefined
			if (data.orgSlug) {
				const org = await prisma.organization.findUnique({
					where: { slug: data.orgSlug },
					select: { id: true },
				})
				if (org) organizationId = org.id
			}

			await prisma.notification.updateMany({
				where: {
					userId,
					isRead: false,
					...(organizationId ? { organizationId } : {}),
				},
				data: { isRead: true, isSeen: true },
			})
			return Response.json({ success: true })
		}
	}
}
