import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { type LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const url = new URL(request.url)
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

	let isClosed = false

	let keepAliveTimer: ReturnType<typeof setInterval>
	let pollTimer: ReturnType<typeof setInterval>

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder()

			const send = (event: string, data: any) => {
				controller.enqueue(encoder.encode(`event: ${event}\n`))
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
			}

			// Keep-alive
			keepAliveTimer = setInterval(() => {
				controller.enqueue(encoder.encode(':\n\n'))
			}, 30000)

			// CAPACITY & CORRECTNESS NOTE:
			// 1. Scales linearly (N queries / 3s). High scale requires Redis pub/sub.
			// 2. Relies on wall-clock time (`updatedAt`). High clock drift between nodes may cause missed events.
			// We overlap using `gte` and `seenIds` to handle same-millisecond edge cases.
			let lastCheckedAt = new Date()
			const seenIds = new Set<string>()

			// Poll the database instead of using EventEmitter (Supports multi-node scaling on LiteFS)
			pollTimer = setInterval(async () => {
				if (isClosed) return

				try {
					const newNotifications = await prisma.notification.findMany({
						where: {
							...whereClause,
							updatedAt: { gte: lastCheckedAt },
						},
						orderBy: { updatedAt: 'asc' },
					})

					const unseen = newNotifications.filter((n) => !seenIds.has(n.id))

					if (unseen.length > 0) {
						lastCheckedAt = unseen[unseen.length - 1]!.updatedAt
						for (const notification of unseen) {
							seenIds.add(notification.id)
							send('notification', notification)
						}

						// Rebuild seenIds to contain only IDs that can be returned by the next gte query
						seenIds.clear()
						for (const n of newNotifications) {
							if (n.updatedAt.getTime() >= lastCheckedAt.getTime()) {
								seenIds.add(n.id)
							}
						}
					}
				} catch (e) {
					console.error('SSE Poll Error', e)
				}
			}, 3000)

			request.signal.addEventListener('abort', () => {
				isClosed = true
				clearInterval(keepAliveTimer)
				clearInterval(pollTimer)
				controller.close()
			})
		},
		cancel() {
			isClosed = true
			if (keepAliveTimer) clearInterval(keepAliveTimer)
			if (pollTimer) clearInterval(pollTimer)
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		},
	})
}
