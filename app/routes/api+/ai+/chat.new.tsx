import { google } from '@ai-sdk/google'
import { invariant } from '@epic-web/invariant'
import { prisma } from '@repo/prisma'
import { streamText } from 'ai'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { markStepCompleted } from '#app/utils/onboarding'

export const action = async ({ request }: ActionFunctionArgs) => {
	if (request.method !== 'POST') {
		throw new Response('Method not allowed', { status: 405 })
	}

	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const noteId = url.searchParams.get('noteId')
	console.log('noteId', noteId)
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

	const { messages } = (await request.json()) as {
		messages: any
	}

	const result = streamText({
		model: google('models/gemini-2.5-flash'),
		system: `\
    You are a friendly assistant that helps users with Epic SaaS, a powerful note-taking and organization management platform. You help users with their complete workflow
    from creating and organizing notes, managing organizations, collaborating with team members, and understanding platform features like authentication,
    permissions, integrations, and content management.
    Your responses are based on the provided context about the platform and its capabilities.
    Right now, the user clicked on the AI assistant widget and your job is to determine their intent.
    The user intent might not be clear, in this case you ask clarification questions.
    The user question might not be complete, in this case you ask for follow up questions.

    Here's a list of user intents to pick from:
    - Note creation and editing
    - Organization management and setup
    - User permissions and access control
    - Content search and discovery
    - Collaboration and sharing features
    - Account and profile management
    - Technical support and troubleshooting
    - Feature explanations and guidance
    - Escalate to human support
    - Ask a clarification/follow up question
    - Platform integrations and workflows
    - Data export and management

    Here's the note context:
    Title: ${note.title}
    Content: ${note.content}
    Comments: ${note.comments.map((comment: any) => `${comment.user.name}: ${comment.content}`).join('\n')}
    `,
		messages,
	})

	return result.toDataStreamResponse()
}
