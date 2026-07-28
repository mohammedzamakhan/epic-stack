import { describe, it, expect, vi } from 'vitest'
import { handleChat, type ChatDependencies } from './chat'
import { prisma } from '@repo/database'

vi.mock('@repo/database', () => ({
	prisma: {
		organizationNote: {
			findUnique: vi.fn(),
		},
	},
}))

describe('handleChat', () => {
	it('calls requireOrgMembership before fetching full note details and comments', async () => {
		const request = new Request(
			'http://localhost/api/ai/chat?noteId=note-123',
			{
				method: 'POST',
				body: JSON.stringify({ messages: [] }),
			},
		)

		const mockFindUnique = prisma.organizationNote
			.findUnique as unknown as ReturnType<typeof vi.fn>

		// First call returns noteMeta
		mockFindUnique.mockResolvedValueOnce({
			id: 'note-123',
			organizationId: 'org-456',
		})

		const requireOrgMembership = vi.fn().mockImplementation(async () => {
			throw new Response('Forbidden', { status: 403 })
		})

		const deps: ChatDependencies = {
			requireUserId: vi.fn().mockResolvedValue('user-789'),
			requireOrgMembership,
			createChatStream: vi.fn(),
			buildNoteChatSystemPrompt: vi.fn(),
			brandSystemPrompt: 'system prompt',
		}

		await expect(
			handleChat({ request, params: {} } as any, deps),
		).rejects.toThrow()

		expect(mockFindUnique).toHaveBeenCalledTimes(1)
		expect(mockFindUnique).toHaveBeenCalledWith({
			where: { id: 'note-123' },
			select: { id: true, organizationId: true },
		})
		expect(requireOrgMembership).toHaveBeenCalledWith(request, 'org-456')
	})
})
