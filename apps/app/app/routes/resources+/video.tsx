import { invariantResponse } from '@epic-web/invariant'
import { getSignedGetRequestInfoAsync } from '#app/utils/storage.server.ts'
import { type LoaderFunctionArgs } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const objectKey = url.searchParams.get('objectKey')
	const organizationId = url.searchParams.get('organizationId')

	invariantResponse(objectKey, 'objectKey is required', { status: 400 })

	let storageUrl: string
	let storageHeaders: Record<string, string>

	try {
		const result = await getSignedGetRequestInfoAsync(
			objectKey,
			organizationId || undefined,
		)
		storageUrl = result.url
		storageHeaders = result.headers
	} catch (error) {
		console.error('[VideoProxy] Error generating signed URL:', error)
		throw new Response('Internal Server Error: Failed to generate signed URL', {
			status: 500,
		})
	}

	const fetchHeaders = new Headers(storageHeaders as Record<string, string>)

	// Forward Range header if present
	const range = request.headers.get('range')
	if (range) {
		fetchHeaders.set('Range', range)
	}

	console.log(`[VideoProxy] Fetching: ${storageUrl}`)
	let response: Response
	try {
		response = await fetch(storageUrl, {
			headers: fetchHeaders,
		})
	} catch (error) {
		console.error(`[VideoProxy] Error fetching video from storage:`, error)
		throw new Response('Internal Server Error: Failed to fetch video', {
			status: 500,
		})
	}

	if (!response.ok) {
		console.error(
			`[VideoProxy] Error fetching video: ${response.status} ${response.statusText}`,
		)
		console.error(`[VideoProxy] Object Key: ${objectKey}`)
		// Try to read body for more info
		let text = ''
		try {
			text = await response.text()
			console.error(`[VideoProxy] Error Body: ${text}`)
		} catch (e) {
			/* ignore */
		}

		return new Response(text, {
			status: response.status,
			headers: response.headers,
		})
	}

	// Forward response headers
	const headers = new Headers(response.headers)

	// Ensure we are passing the correct content type for video
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'video/mp4')
	}

	return new Response(response.body, {
		status: response.status,
		headers,
	})
}
