import { invariant } from '@epic-web/invariant'
import { brand } from '@repo/config/brand'
import { prisma } from '@repo/prisma'
import {
	createChatStream,
	buildNoteChatSystemPrompt,
	type NoteContext,
} from '@repo/ai'
import { type Message } from 'ai'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { markStepCompleted } from '#app/utils/onboarding.ts'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const action = async ({ request }: ActionFunctionArgs) => {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const noteId = url.searchParams.get('noteId')

	if (!noteId) {
		invariant(noteId, 'Note ID is required')
	}

	const note = await prisma.organizationNote.findUnique({
		where: { id: noteId },
		select: {
			content: true,
			title: true,
			organizationId: true,
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

	// Track AI chat usage for onboarding
	try {
		await markStepCompleted(userId, note.organizationId, 'try_ai_chat', {
			completedVia: 'ai_chat_usage',
			noteId,
		})
	} catch (error) {
		// Don't fail the AI request if onboarding tracking fails
		console.error('Failed to track AI chat onboarding step:', error)
	}

	const { messages } = (await request.json()) as { messages: Message[] }

	// Build note context
	const noteContext: NoteContext = {
		title: note.title,
		content: note.content,
		wordCount: note.content ? note.content.split(/\s+/).length : 0,
		hasComments: note.comments && note.comments.length > 0,
		commentCount: note.comments?.length || 0,
		comments: note.comments.map((comment) => ({
			content: comment.content,
			userName: comment.user.name,
		})),
	}

	// Build system prompt with note context
	const systemPrompt = buildNoteChatSystemPrompt(
		brand.ai.systemPrompt,
		noteContext,
	)

	// Create streaming chat response
	const result = createChatStream({
		messages,
		systemPrompt,
	})

	return result.toDataStreamResponse()
}
