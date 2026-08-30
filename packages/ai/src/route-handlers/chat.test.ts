import { describe, it, expect, vi } from 'vitest'
import { db } from '@repo/database'

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

function streamResult() {
	return {
		toUIMessageStreamResponse: vi.fn(() => new Response('ok')),
	}
}

function baseDeps(overrides: Partial<ChatDependencies> = {}): ChatDependencies {
	return {
		requireUserId: vi.fn().mockResolvedValue('user-789'),
		requireOrgMembership: vi.fn(),
		createChatStream: vi.fn(() => streamResult()),
		buildNoteChatSystemPrompt: vi.fn(),
		brandSystemPrompt: 'system prompt',
		...overrides,
	}
}

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

		const deps = baseDeps({ requireOrgMembership })

		await expect(
			handleChat({ request, params: {} } as any, deps),
		).rejects.toThrow()

		expect(db.select).toHaveBeenCalledTimes(1)
		expect(requireOrgMembership).toHaveBeenCalledWith(request, 'org-456')
	})

	it('enables website editor tools for any org page, not only the current editor', async () => {
		const request = new Request('http://localhost/api/ai/chat?orgSlug=acme', {
			method: 'POST',
			body: JSON.stringify({ messages: [] }),
		})

		const pages = [
			{
				id: 'home-1',
				title: 'Home',
				slug: 'home',
				isHomePage: true,
				sections: [{ id: 'hero-1', type: 'hero', position: 0 }],
			},
			{
				id: 'about-1',
				title: 'About Us',
				slug: 'about',
				isHomePage: false,
				sections: [{ id: 'content-1', type: 'content', position: 0 }],
			},
		]
		const tools = { navigateToPage: {} }
		const getPageEditorTools = vi.fn(() => tools)
		const getWebsitePages = vi.fn().mockResolvedValue(pages)
		const getPageContext = vi.fn()
		const buildPageEditorSystemPrompt = vi.fn(
			(base: string) => `${base}\nwebsite`,
		)
		const resolveOrganizationFromSlug = vi
			.fn()
			.mockResolvedValue({ id: 'org-456' })
		const createChatStream = vi.fn(() => streamResult())

		const deps = baseDeps({
			createChatStream,
			buildPageEditorSystemPrompt,
			getPageEditorTools,
			getWebsitePages,
			getPageContext,
			resolveOrganizationFromSlug,
		})

		const response = await handleChat({ request, params: {} } as any, deps)

		expect(response).toBeInstanceOf(Response)
		expect(resolveOrganizationFromSlug).toHaveBeenCalledWith(request, 'acme')
		expect(getWebsitePages).toHaveBeenCalledWith('org-456')
		expect(getPageContext).not.toHaveBeenCalled()
		expect(getPageEditorTools).toHaveBeenCalledWith({
			organizationId: 'org-456',
		})
		expect(buildPageEditorSystemPrompt).toHaveBeenCalledWith('system prompt', {
			pages,
			currentPageId: null,
			currentPage: null,
		})
		expect(createChatStream).toHaveBeenCalledWith(
			expect.objectContaining({
				tools,
				systemPrompt: 'system prompt\nwebsite',
			}),
		)
	})

	it('loads the currently viewed page when pageId is provided', async () => {
		const request = new Request('http://localhost/api/ai/chat?orgSlug=acme', {
			method: 'POST',
			body: JSON.stringify({ messages: [], pageId: 'about-1' }),
		})

		const currentPage = {
			id: 'about-1',
			title: 'About Us',
			slug: 'about',
			isHomePage: false,
			sections: [
				{ id: 'content-1', type: 'content', position: 0, config: '{}' },
			],
		}
		const createChatStream = vi.fn(() => streamResult())

		const deps = baseDeps({
			createChatStream,
			buildPageEditorSystemPrompt: vi.fn((base: string) => base),
			getPageEditorTools: vi.fn(() => ({})),
			getWebsitePages: vi.fn().mockResolvedValue([]),
			getPageContext: vi.fn().mockResolvedValue(currentPage),
			resolveOrganizationFromSlug: vi.fn().mockResolvedValue({ id: 'org-456' }),
		})

		await handleChat({ request, params: {} } as any, deps)

		expect(deps.getPageContext).toHaveBeenCalledWith('about-1', 'org-456')
		expect(deps.buildPageEditorSystemPrompt).toHaveBeenCalledWith(
			'system prompt',
			{
				pages: [],
				currentPageId: 'about-1',
				currentPage,
			},
		)
	})

	it('falls back to general chat when the user cannot access website tools', async () => {
		const request = new Request('http://localhost/api/ai/chat?orgSlug=acme', {
			method: 'POST',
			body: JSON.stringify({ messages: [] }),
		})
		const createChatStream = vi.fn(() => streamResult())

		const deps = baseDeps({
			createChatStream,
			getPageEditorTools: vi.fn(() => ({})),
			resolveOrganizationFromSlug: vi
				.fn()
				.mockRejectedValue(new Response('Forbidden', { status: 403 })),
		})

		await handleChat({ request, params: {} } as any, deps)

		expect(createChatStream).toHaveBeenCalledWith({
			messages: [],
			systemPrompt: 'system prompt',
		})
	})
})
