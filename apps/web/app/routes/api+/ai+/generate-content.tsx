import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
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

		const { text } = await generateText({
			model: google('models/gemini-2.5-flash'),
			prompt: `Based on the title "${title}", generate a comprehensive and well-structured note content. The content should be informative, engaging, and relevant to the title. Format it as clean Markdown with proper paragraph tags, headings (h2, h3), lists, and other semantic elements as appropriate. Make sure it has line breaks after each section. Keep it between 100-200 words. Do not include any HTML document structure (no html, head, body tags), just the content markup using markdown.`,
		})

		return data({ success: true, content: text })
	} catch (error) {
		console.error('AI generation error:', error)
		return data(
			{ error: 'Failed to generate content. Please try again.' },
			{ status: 500 },
		)
	}
}
