import { promises as fs, constants } from 'node:fs'
import { invariantResponse } from '@epic-web/invariant'
import { getImgResponse } from 'openimg/node'
import { getDomainUrl } from '#app/utils/misc.tsx'
import { getSignedGetRequestInfoAsync } from '#app/utils/storage.server.ts'
import { type Route } from './+types/images'

let cacheDir: string | 'no_cache' | null = null

async function getCacheDir() {
	if (cacheDir) return cacheDir

	let dir: string | 'no_cache' = './tests/fixtures/openimg'
	if (process.env.NODE_ENV === 'production') {
		const isAccessible = await fs
			.access('/data', constants.W_OK)
			.then(() => true)
			.catch(() => false)

		if (isAccessible) {
			dir = '/data/images'
		} else {
			console.warn(
				'Production cache directory /data is not writable, disabling image cache',
			)
			dir = 'no_cache'
		}
	}

	return (cacheDir = dir)
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const searchParams = url.searchParams

	const headers = new Headers()
	headers.set('Cache-Control', 'public, max-age=31536000, immutable')

	const objectKey = searchParams.get('objectKey')
	const organizationId = searchParams.get('organizationId')

	return getImgResponse(request, {
		headers,
		allowlistedOrigins: [
			getDomainUrl(request),
			process.env.AWS_ENDPOINT_URL_S3,
		].filter(Boolean),
		cacheFolder: await getCacheDir(),
		getImgSource: async () => {
			if (objectKey) {
				const { url: signedUrl, headers: signedHeaders } =
					await getSignedGetRequestInfoAsync(objectKey, organizationId!)
				return {
					type: 'fetch',
					url: signedUrl,
					headers: signedHeaders,
				}
			}

			const src = searchParams.get('src')
			invariantResponse(src, 'src query parameter is required', { status: 400 })

			if (URL.canParse(src)) {
				// Fetch image from external URL; will be matched against allowlist
				return {
					type: 'fetch',
					url: src,
				}
			}
			// Retrieve image from filesystem (public folder)
			if (src.startsWith('/assets')) {
				// Files managed by Vite
				return {
					type: 'fs',
					path: '.' + src,
				}
			}
			// Fallback to files in public folder
			return {
				type: 'fs',
				path: './public' + src,
			}
		},
	})
}
