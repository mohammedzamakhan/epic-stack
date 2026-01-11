import { defineMiddleware } from 'astro:middleware'

const CACHE_CONTROL_STATIC = 's-maxage=3600, stale-while-revalidate=86400'
const CACHE_CONTROL_NO_CACHE = 'no-store, no-cache, must-revalidate'

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
}

function shouldSkipCache(pathname: string): boolean {
	return (
		pathname.startsWith('/api/') ||
		pathname.startsWith('/preview/') ||
		pathname.includes('/_')
	)
}

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next()
	const { pathname } = context.url

	const newHeaders = new Headers(response.headers)

	for (const [key, value] of Object.entries(securityHeaders)) {
		newHeaders.set(key, value)
	}

	if (shouldSkipCache(pathname)) {
		newHeaders.set('Cache-Control', CACHE_CONTROL_NO_CACHE)
	} else {
		newHeaders.set('Cache-Control', CACHE_CONTROL_STATIC)
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
})
