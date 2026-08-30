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
	buildPageEditorSystemPrompt?: (basePrompt: string, pageContext: any) => string
	brandSystemPrompt: string
	getPageEditorTools?: () => Record<string, any>
	getPageContext?: (pageId: string) => Promise<any>
	markStepCompleted?: (
		userId: string,
		organizationId: string,
		stepKey: string,
		options: any,
	) => Promise<void>
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
	const pageId = url.searchParams.get('pageId')

	const { messages } = (await request.json()) as { messages: ModelMessage[] }

	// When pageId is present, run a page editor conversation.
	if (pageId && deps.getPageEditorTools) {
		const pageContext = deps.getPageContext
			? await deps.getPageContext(pageId)
			: { pageId }
		const systemPrompt = deps.buildPageEditorSystemPrompt
			? deps.buildPageEditorSystemPrompt(deps.brandSystemPrompt, pageContext)
			: deps.brandSystemPrompt +
				'\n\nYou are helping the user edit a website page.'
		const result = deps.createChatStream({
			messages,
			systemPrompt,
			tools: deps.getPageEditorTools(),
		})
		return result.toDataStreamResponse()
	}

	// When noteId is absent, run a general (note-less) conversation.
	if (!noteId) {
		const systemPrompt = deps.brandSystemPrompt
		const result = deps.createChatStream({ messages, systemPrompt })
		return result.toDataStreamResponse()
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

	return result.toDataStreamResponse()
}
