import type { APIRoute } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import PreviewContent from '@/components/PreviewContent.astro'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
	try {
		const data = await request.json()

		if (!data || !data.post) {
			throw new Error('Invalid request data: missing post')
		}

		// Create an Astro container to render the component
		const container = await AstroContainer.create()

		// Render the PreviewContent component with the post data
		const result = await container.renderToString(PreviewContent, {
			props: { data: data.post },
		})

		return new Response(result, {
			headers: {
				'Content-Type': 'text/html',
			},
		})
	} catch (error) {
		console.error('Preview error:', error)
		return new Response(
			JSON.stringify({ error: 'Failed to process preview' }),
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json',
				},
			},
		)
	}
}
