import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	notifyCommentMentions,
	notifyNoteOwner,
} from './notifications.server.ts'
import { prisma } from '@repo/database'
import { sendEmail } from '@repo/email'

vi.hoisted(() => {
	process.env.APP_URL = 'http://localhost:3000'
})

vi.mock('@repo/database', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
		},
		userOrganization: {
			findMany: vi.fn(),
		},
		notificationPreference: {
			findUnique: vi.fn(),
		},
		notification: {
			upsert: vi.fn(),
		},
	},
}))

vi.mock('@repo/email', () => ({
	sendEmail: vi.fn().mockResolvedValue({ status: 'success' }),
	MentionEmail: vi.fn().mockReturnValue('MentionEmailComponent'),
	CommentEmail: vi.fn().mockReturnValue('CommentEmailComponent'),
}))

describe('Notifications Server Utils', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('notifyCommentMentions', () => {
		it('should not notify if no mentions found', async () => {
			await notifyCommentMentions({
				noteId: 'note1',
				noteTitle: 'Note 1',
				noteOwnerId: 'owner1',
				commentId: 'comment1',
				commenterUserId: 'user1',
				commenterName: 'Commenter',
				commentContent: 'Hello world',
				organizationId: 'org1',
				organizationSlug: 'acme',
			})
			expect(prisma.userOrganization.findMany).not.toHaveBeenCalled()
		})

		it('should notify mentioned users if preferences allow', async () => {
			vi.mocked(prisma.userOrganization.findMany).mockResolvedValue([
				{
					user: {
						id: 'user2',
						username: 'testuser',
						email: 'test@example.com',
					},
				},
			] as any)
			vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
				null,
			) // Defaults to true

			await notifyCommentMentions({
				noteId: 'note1',
				noteTitle: 'Note 1',
				noteOwnerId: 'owner1',
				commentId: 'comment1',
				commenterUserId: 'user1',
				commenterName: 'Commenter',
				commentContent: 'Hello @testuser',
				organizationId: 'org1',
				organizationSlug: 'acme',
			})

			expect(prisma.userOrganization.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: 'org1',
					}),
				}),
			)

			expect(prisma.notification.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: expect.objectContaining({
						type: 'mention',
						userId: 'user2',
					}),
				}),
			)
			expect(sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'test@example.com',
					subject: 'Commenter mentioned you in a comment',
				}),
			)
		})

		it('should respect false preferences', async () => {
			vi.mocked(prisma.userOrganization.findMany).mockResolvedValue([
				{
					user: {
						id: 'user2',
						username: 'testuser',
						email: 'test@example.com',
					},
				},
			] as any)
			vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
				inApp: false,
				email: false,
			} as any)

			await notifyCommentMentions({
				noteId: 'note1',
				noteTitle: 'Note 1',
				noteOwnerId: 'owner1',
				commentId: 'comment1',
				commenterUserId: 'user1',
				commenterName: 'Commenter',
				commentContent: 'Hello @testuser',
				organizationId: 'org1',
				organizationSlug: 'acme',
			})

			expect(prisma.notification.upsert).not.toHaveBeenCalled()
			expect(sendEmail).not.toHaveBeenCalled()
		})
	})

	describe('notifyNoteOwner', () => {
		it('should not notify if commenter is the note owner', async () => {
			await notifyNoteOwner({
				noteId: 'note1',
				noteTitle: 'Note 1',
				noteOwnerId: 'user1',
				commentId: 'comment1',
				commenterUserId: 'user1',
				commenterName: 'User 1',
				commentContent: 'My comment',
				organizationId: 'org1',
				organizationSlug: 'acme',
			})
			expect(prisma.user.findUnique).not.toHaveBeenCalled()
		})

		it('should create notification and send email if preferences allow', async () => {
			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				id: 'owner1',
				email: 'owner@example.com',
			} as any)
			vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
				null,
			)

			await notifyNoteOwner({
				noteId: 'note1',
				noteTitle: 'Note 1',
				noteOwnerId: 'owner1',
				commentId: 'comment1',
				commenterUserId: 'user2',
				commenterName: 'User 2',
				commentContent: 'A comment',
				organizationId: 'org1',
				organizationSlug: 'acme',
			})

			expect(prisma.notification.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: expect.objectContaining({
						type: 'comment',
						userId: 'owner1',
					}),
				}),
			)
			expect(sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'owner@example.com',
					subject: 'New comment on your note: Note 1',
				}),
			)
		})
	})
})
