import { describe, it, expect, vi } from 'vitest'
import { handleChat, type ChatDependencies } from './chat'
import { db } from '@repo/database'

vi.mock('@repo/database', () => ({
	db: {
		select: vi.fn(),
	},
	OrganizationNote: { id: 'id', organizationId: 'organizationId' },
	NoteAccess: {},
	NoteComment: {},
	User: {},
	eq: vi.fn(),
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

		const mockSelect = db.select as unknown as ReturnType<typeof vi.fn>

		mockSelect.mockReturnValueOnce({
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi
				.fn()
				.mockResolvedValue([{ id: 'note-123', organizationId: 'org-456' }]),
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

		expect(mockSelect).toHaveBeenCalledTimes(1)
		expect(requireOrgMembership).toHaveBeenCalledWith(request, 'org-456')
	})
})
