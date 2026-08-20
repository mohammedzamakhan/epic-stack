import { db } from '@repo/database'
import { describe, it, expect, vi } from 'vitest'

import { handleChat, type ChatDependencies } from './chat'

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@repo/database')>()
	const table = new Proxy({}, { get: (_, property) => property })
	const operator = vi.fn((...args: unknown[]) => args)
	const limit = vi
		.fn()
		.mockResolvedValue([{ id: 'note-123', organizationId: 'org-456' }])
	const where = vi.fn().mockReturnValue({ limit })
	const from = vi.fn().mockReturnValue({ where })
	return {
		...actual,
		db: { select: vi.fn().mockReturnValue({ from }) },
		OrganizationNote: table,
		NoteAccess: table,
		NoteComment: table,
		User: table,
		eq: operator,
	}
})

describe('handleChat', () => {
	it('calls requireOrgMembership before fetching full note details and comments', async () => {
		const request = new Request(
			'http://localhost/api/ai/chat?noteId=note-123',
			{
				method: 'POST',
				body: JSON.stringify({ messages: [] }),
			},
		)

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

		expect(db.select).toHaveBeenCalledTimes(1)
		expect(requireOrgMembership).toHaveBeenCalledWith(request, 'org-456')
	})
})
