import { google } from '@ai-sdk/google'
import { invariant } from '@epic-web/invariant'
import { brand } from '@repo/config/brand'
import { prisma } from '@repo/prisma'
import { streamText, type Message } from 'ai'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { markStepCompleted } from '#app/utils/onboarding.ts'

// Define Comment type based on Prisma query result
type CommentData = {
	content: string
	user: {
		name: string | null
	}
}

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

	// Get additional context for better responses
	const noteWordCount = note.content ? note.content.split(/\s+/).length : 0
	const hasComments = note.comments && note.comments.length > 0
	const commentCount = note.comments?.length || 0

	const result = streamText({
		model: google('models/gemini-2.5-flash'),
		messages,
		system:
			brand.ai.systemPrompt +
			`

## Your Core Capabilities:
- **Content Analysis**: Summarize, extract key points, identify themes, and suggest improvements
- **Task Management**: Create action items, prioritize tasks, set deadlines, and track progress  
- **Collaboration**: Facilitate team discussions, resolve conflicts, and improve communication
- **Organization**: Structure information, create templates, and establish workflows
- **Integration**: Connect with external tools and automate processes
- **Learning**: Provide tutorials, best practices, and feature guidance

## Current Note Context:
**Title**: ${note.title || 'Untitled Note'}
**Content Length**: ${noteWordCount} words
**Has Comments**: ${hasComments ? `Yes (${commentCount} comments)` : 'No'}
**Content Preview**: ${note.content ? note.content.substring(0, 500) + (note.content.length > 500 ? '...' : '') : 'No content yet'}

${hasComments ? `**Recent Comments**:\n${note.comments.map((comment: CommentData) => `- ${comment.user.name}: ${comment.content}`).join('\n')}` : ''}

## Response Guidelines:
- Be conversational, helpful, and actionable
- Provide specific, practical suggestions when possible
- Ask clarifying questions to better understand user needs
- Reference the note content directly when relevant
- Suggest next steps or follow-up actions
- Keep responses concise but comprehensive
- **Use Markdown formatting** for better readability:
  - Use \`**bold**\` for emphasis and key points
  - Use \`- bullet points\` for lists and action items
  - Use \`1. numbered lists\` for sequential steps
  - Use \`> blockquotes\` for important notes or quotes
  - Use \`\\\`code\\\`\` for technical terms or specific features
  - Use \`## headings\` to organize longer responses
  - Use \`---\` for section breaks when needed
  - Use tables for comparisons or structured data

## Common User Intents to Address:
- **Content Enhancement**: "How can I improve this note?" → Suggest structure, clarity, completeness
- **Task Extraction**: "What actions should I take?" → Identify and prioritize actionable items
- **Summarization**: "Give me the key points" → Create concise, organized summaries
- **Collaboration**: "How should I share this?" → Recommend sharing strategies and permissions
- **Organization**: "How should I organize this?" → Suggest categories, tags, and structure
- **Integration**: "What tools can help?" → Recommend relevant integrations and workflows

Remember: You're not just answering questions—you're helping users think through problems and achieve their goals more effectively. Always format your responses with markdown for the best user experience.`,
	})

	return result.toDataStreamResponse()
}
