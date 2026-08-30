import { invariant, invariantResponse } from '@epic-web/invariant'
import type { ModelMessage } from 'ai'
import { type ActionFunctionArgs } from 'react-router'
import {
	NoteAccess,
	NoteComment,
	OrganizationNote,
	User,
	db,
	eq,
} from '@repo/database'

export type WebsitePageSectionContext = {
	id: string
	type: string
	position: number
	config?: string
}

export type WebsitePageListItem = {
	id: string
	title: string
	slug: string
	isHomePage: boolean
	sections: WebsitePageSectionContext[]
}

export type PageEditorPromptContext = {
	pages: WebsitePageListItem[]
	currentPageId: string | null
	currentPage: {
		id: string
		title: string
		slug: string
		isHomePage?: boolean
		sections: WebsitePageSectionContext[]
	} | null
}

export interface ChatDependencies {
	requireUserId: (request: Request) => Promise<string>
	/**
	 * Must verify the user is an active member of the given organization.
	 * Throw a 403 Response if not. Matches the same permission check used
	 * by the note detail loader (READ_NOTE_OWN).
	 */
	requireOrgMembership: (
		request: Request,
		organizationId: string,
	) => Promise<unknown>
	createChatStream: (params: {
		messages: ModelMessage[]
		systemPrompt: string
		tools?: Record<string, any>
	}) => any
	buildNoteChatSystemPrompt: (basePrompt: string, noteContext: any) => string
	buildPageEditorSystemPrompt?: (
		basePrompt: string,
		pageContext: PageEditorPromptContext,
	) => string
	brandSystemPrompt: string
	getPageEditorTools?: (ctx: { organizationId: string }) => Record<string, any>
	getPageContext?: (
		pageId: string,
		organizationId: string,
	) => Promise<PageEditorPromptContext['currentPage']>
	getWebsitePages?: (organizationId: string) => Promise<WebsitePageListItem[]>
	resolveOrganizationFromSlug?: (
		request: Request,
		orgSlug: string,
	) => Promise<{ id: string }>
	markStepCompleted?: (
		userId: string,
		organizationId: string,
		stepKey: string,
		options: any,
	) => Promise<void>
}

function toChatStreamResponse(result: {
	toUIMessageStreamResponse?: () => Response
	toDataStreamResponse?: () => Response
}) {
	if (typeof result.toUIMessageStreamResponse === 'function') {
		return result.toUIMessageStreamResponse()
	}
	if (typeof result.toDataStreamResponse === 'function') {
		return result.toDataStreamResponse()
	}
	throw new Error('Chat stream result is missing a response converter')
}

/**
 * Shared handler for AI chat streaming.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, AI utilities)
 * @returns Streaming response
 */
export async function handleChat(
	{ request }: ActionFunctionArgs,
	deps: ChatDependencies,
) {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const userId = await deps.requireUserId(request)
	const url = new URL(request.url)
	const noteId = url.searchParams.get('noteId')
	const orgSlug = url.searchParams.get('orgSlug')

	const body = (await request.json()) as {
		messages: ModelMessage[]
		pageId?: string | null
	}
	const { messages } = body
	const pageId = url.searchParams.get('pageId') ?? body.pageId ?? null

	// When noteId is absent, website tools are available for any org page —
	// not only the page currently open in the editor. Missing website
	// permission falls through to general chat instead of failing the request.
	if (
		!noteId &&
		orgSlug &&
		deps.getPageEditorTools &&
		deps.resolveOrganizationFromSlug
	) {
		try {
			const organization = await deps.resolveOrganizationFromSlug(
				request,
				orgSlug,
			)
			const pages = deps.getWebsitePages
				? await deps.getWebsitePages(organization.id)
				: []
			const currentPage =
				pageId && deps.getPageContext
					? await deps.getPageContext(pageId, organization.id)
					: (pages.find((page) => page.id === pageId) ?? null)
			const pageContext: PageEditorPromptContext = {
				pages,
				currentPageId: pageId,
				currentPage,
			}
			const systemPrompt = deps.buildPageEditorSystemPrompt
				? deps.buildPageEditorSystemPrompt(deps.brandSystemPrompt, pageContext)
				: deps.brandSystemPrompt +
					'\n\nYou are helping the user edit their website pages.'
			const result = deps.createChatStream({
				messages,
				systemPrompt,
				tools: deps.getPageEditorTools({ organizationId: organization.id }),
			})
			return toChatStreamResponse(result)
		} catch (error) {
			if (!(error instanceof Response) || error.status !== 403) {
				throw error
			}
		}
	}

	// When noteId is absent, run a general (note-less) conversation.
	if (!noteId) {
		const systemPrompt = deps.brandSystemPrompt
		const result = deps.createChatStream({ messages, systemPrompt })
		return toChatStreamResponse(result)
	}

	const [noteMeta] = await db
		.select({
			id: OrganizationNote.id,
			organizationId: OrganizationNote.organizationId,
		})
		.from(OrganizationNote)
		.where(eq(OrganizationNote.id, noteId))
		.limit(1)

	if (!noteMeta) {
		invariant(noteMeta, 'Note not found')
	}

	// Enforce org membership before reading note details or comments.
	await deps.requireOrgMembership(request, noteMeta.organizationId)

	const [note, noteAccess, comments] = await Promise.all([
		db
			.select({
				content: OrganizationNote.content,
				title: OrganizationNote.title,
				organizationId: OrganizationNote.organizationId,
				isPublic: OrganizationNote.isPublic,
				createdById: OrganizationNote.createdById,
			})
			.from(OrganizationNote)
			.where(eq(OrganizationNote.id, noteId))
			.limit(1)
			.then((rows) => rows[0]),
		db
			.select({ userId: NoteAccess.userId })
			.from(NoteAccess)
			.where(eq(NoteAccess.noteId, noteId)),
		db
			.select({ content: NoteComment.content, userName: User.name })
			.from(NoteComment)
			.leftJoin(User, eq(NoteComment.userId, User.id))
			.where(eq(NoteComment.noteId, noteId)),
	])

	if (!note) {
		invariant(note, 'Note not found')
	}

	if (!note.isPublic) {
		const hasPersonalAccess =
			note.createdById === userId ||
			noteAccess.some((access) => access.userId === userId)
		invariantResponse(
			hasPersonalAccess,
			'Not authorized - insufficient note permissions',
			{ status: 403 },
		)
	}

	// Track AI chat usage for onboarding (if markStepCompleted is provided)
	if (deps.markStepCompleted) {
		try {
			await deps.markStepCompleted(userId, note.organizationId, 'try_ai_chat', {
				completedVia: 'ai_chat_usage',
				noteId,
			})
		} catch (error) {
			// Don't fail the AI request if onboarding tracking fails
			console.error('Failed to track AI chat onboarding step:', error)
		}
	}

	// Build note context
	const noteContext = {
		title: note.title,
		content: note.content,
		wordCount: note.content ? note.content.split(/\s+/).length : 0,
		hasComments: comments.length > 0,
		commentCount: comments.length,
		comments: comments.map((comment) => ({
			content: comment.content,
			userName: comment.userName,
		})),
	}

	// Build system prompt with note context
	const systemPrompt = deps.buildNoteChatSystemPrompt(
		deps.brandSystemPrompt,
		noteContext,
	)

	// Create streaming chat response
	const result = deps.createChatStream({
		messages,
		systemPrompt,
	})

	return toChatStreamResponse(result)
}
