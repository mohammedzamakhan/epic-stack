import { generateNoteContent } from '@repo/ai'
import { data, type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)

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

		const text = await generateNoteContent(title)

		return data({ success: true, content: text })
	} catch (error) {
		console.error('AI generation error:', error)
		return data(
			{ error: 'Failed to generate content. Please try again.' },
			{ status: 500 },
		)
	}
}
