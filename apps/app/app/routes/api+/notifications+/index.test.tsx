import { requireUserId } from '@repo/auth'
import { db } from '@repo/database'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { action, loader } from './index.tsx'

vi.mock('@repo/auth', () => ({
	requireUserId: vi.fn().mockResolvedValue('user1'),
}))

vi.mock('@repo/database', () => ({
	db: {
		notification: {
			findMany: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
		},
		organization: {
			findUnique: vi.fn().mockResolvedValue({ id: 'org1' }),
		},
	},
}))

describe('Notifications API Routes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('loader', () => {
		it('returns notifications for user', async () => {
			const request = new Request('http://localhost/api/notifications')
			const response = await loader({ request, params: {} } as any)
			const data = (await response.json()) as any

			expect(data).toEqual({
				notifications: [],
				unreadCount: 0,
			})
			expect(requireUserId).toHaveBeenCalledWith(request)
			expect(db.notification.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						userId: 'user1',
					}),
				}),
			)
		})

		it('applies orgSlug filter if provided', async () => {
			const request = new Request(
				'http://localhost/api/notifications?orgSlug=acme',
			)
			await loader({ request, params: {} } as any)

			expect(db.organization.findUnique).toHaveBeenCalledWith({
				where: { slug: 'acme' },
				select: { id: true },
			})
			expect(db.notification.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						userId: 'user1',
						organizationId: 'org1',
					}),
				}),
			)
		})
	})

	describe('action', () => {
		it('handles markAllAsRead', async () => {
			const formData = new FormData()
			formData.append('intent', 'markAllAsRead')
			const request = new Request('http://localhost/api/notifications', {
				method: 'POST',
				body: formData,
			})

			const response = await action({ request, params: {} } as any)
			const data = (await response.json()) as any

			expect(data.success).toBe(true)
			expect(db.notification.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						userId: 'user1',
						isRead: false,
					}),
					data: { isRead: true, isSeen: true },
				}),
			)
		})

		it('handles markAllAsRead with orgSlug', async () => {
			const formData = new FormData()
			formData.append('intent', 'markAllAsRead')
			formData.append('orgSlug', 'acme')
			const request = new Request('http://localhost/api/notifications', {
				method: 'POST',
				body: formData,
			})

			const response = await action({ request, params: {} } as any)
			const data = (await response.json()) as any

			expect(data.success).toBe(true)
			expect(db.organization.findUnique).toHaveBeenCalledWith({
				where: { slug: 'acme' },
				select: { id: true },
			})
			expect(db.notification.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						userId: 'user1',
						isRead: false,
						organizationId: 'org1',
					}),
					data: { isRead: true, isSeen: true },
				}),
			)
		})

		it('handles markAsRead', async () => {
			const formData = new FormData()
			formData.append('intent', 'markAsRead')
			formData.append('notificationId', 'notif1')
			const request = new Request('http://localhost/api/notifications', {
				method: 'POST',
				body: formData,
			})

			const response = await action({ request, params: {} } as any)
			const data = (await response.json()) as any

			expect(data.success).toBe(true)
			expect(db.notification.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						userId: 'user1',
						id: 'notif1',
					}),
					data: { isRead: true, isSeen: true },
				}),
			)
		})
	})
})
