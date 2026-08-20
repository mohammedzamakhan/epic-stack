import { invariantResponse } from '@epic-web/invariant'
import {
	getSignedGetRequestInfoAsync,
	getSignedHeadRequestInfoAsync,
} from '#app/utils/storage.server.ts'
import { type Route } from './+types/videos.source.ts'

const PASSTHROUGH_HEADERS = [
	'content-type',
	'content-length',
	'content-range',
	'accept-ranges',
	'etag',
	'last-modified',
] as const

function validateObjectKey(objectKey: string | null) {
	invariantResponse(objectKey, 'objectKey query parameter is required', {
		status: 400,
	})
	invariantResponse(
		objectKey.length >= 16 &&
			!objectKey.includes('..') &&
			/^[a-zA-Z0-9_\-./]+$/.test(objectKey),
		'Invalid or low-entropy objectKey parameter',
		{ status: 400 },
	)
	return objectKey
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const objectKey = validateObjectKey(url.searchParams.get('objectKey'))
	const organizationId = url.searchParams.get('organizationId') ?? undefined
	const method = request.method === 'HEAD' ? 'HEAD' : 'GET'

	const { url: storageUrl, headers: signedHeaders } =
		method === 'HEAD'
			? await getSignedHeadRequestInfoAsync(objectKey, organizationId)
			: await getSignedGetRequestInfoAsync(objectKey, organizationId)

	const upstreamHeaders = new Headers(signedHeaders)
	const range = request.headers.get('Range')
	if (range) {
		upstreamHeaders.set('Range', range)
	}

	const upstream = await fetch(storageUrl, {
		method,
		headers: upstreamHeaders,
	})

	const responseHeaders = new Headers()
	for (const headerName of PASSTHROUGH_HEADERS) {
		const value = upstream.headers.get(headerName)
		if (value) {
			responseHeaders.set(headerName, value)
		}
	}
	responseHeaders.set('Accept-Ranges', 'bytes')
	responseHeaders.set('Cache-Control', 'private, max-age=3600')
	responseHeaders.set('Access-Control-Allow-Origin', '*')

	if (method === 'HEAD') {
		return new Response(null, {
			status: upstream.status,
			headers: responseHeaders,
		})
	}

	return new Response(upstream.body, {
		status: upstream.status,
		headers: responseHeaders,
	})
}
