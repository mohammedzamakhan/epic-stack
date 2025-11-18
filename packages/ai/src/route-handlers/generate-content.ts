import { data, type ActionFunctionArgs } from 'react-router'

export interface GenerateContentDependencies {
	requireUserId: (request: Request) => Promise<string>
	generateNoteContent: (title: string) => Promise<string>
}

/**
 * Shared handler for generating AI content.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (auth, AI utilities)
 * @returns JSON response with generated content
 */
export async function handleGenerateContent(
	{ request }: ActionFunctionArgs,
	deps: GenerateContentDependencies,
) {
	await deps.requireUserId(request)

	if (request.method !== 'POST') {
		return data({ error: 'Method not allowed' }, { status: 405 })
	}

	try {
		const formData = await request.formData()
		const title = formData.get('title')?.toString()
		const intent = formData.get('intent')?.toString()

		if (intent !== 'generate-content' || !title) {
			return data({ error: 'Invalid request' }, { status: 400 })
		}

		const text = await deps.generateNoteContent(title)

		return data({ success: true, content: text })
	} catch (error) {
		console.error('AI generation error:', error)
		return data(
			{ error: 'Failed to generate content. Please try again.' },
			{ status: 500 },
		)
	}
}
