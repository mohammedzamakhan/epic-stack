import { invariant, invariantResponse } from '@epic-web/invariant'
import type { PrismaClient } from '@prisma/client'
import type { CoreMessage } from 'ai'
import { type ActionFunctionArgs } from 'react-router'

export interface ChatDependencies {
	requireUserId: (request: Request) => Promise<string>
	prisma: PrismaClient
	createChatStream: (params: {
		messages: CoreMessage[]
		systemPrompt: string
	}) => any
	buildNoteChatSystemPrompt: (basePrompt: string, noteContext: any) => string
	brandSystemPrompt: string
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
 * @param deps - Dependencies (auth, AI utilities, prisma)
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

	if (!noteId) {
		invariant(noteId, 'Note ID is required')
	}

	const note = await deps.prisma.organizationNote.findUnique({
		where: { id: noteId },
		select: {
			content: true,
			title: true,
			organizationId: true,
			isPublic: true,
			createdById: true,
			noteAccess: {
				select: {
					userId: true,
				},
			},
			comments: {
				select: {
					content: true,
					user: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	})

	if (!note) {
		invariant(note, 'Note not found')
	}

	if (!note.isPublic) {
		const hasPersonalAccess =
			note.createdById === userId ||
			note.noteAccess.some(
				(access: { userId: string }) => access.userId === userId,
			)
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

	const { messages } = (await request.json()) as { messages: CoreMessage[] }

	// Build note context
	const noteContext = {
		title: note.title,
		content: note.content,
		wordCount: note.content ? note.content.split(/\s+/).length : 0,
		hasComments: note.comments && note.comments.length > 0,
		commentCount: note.comments?.length || 0,
		comments: note.comments.map((comment: any) => ({
			content: comment.content,
			userName: comment.user.name,
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
