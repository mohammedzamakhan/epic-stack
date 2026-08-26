import { defineMiddleware } from 'astro:middleware'

const CACHE_CONTROL_STATIC = 's-maxage=3600, stale-while-revalidate=86400'
const CACHE_CONTROL_NO_CACHE = 'no-store, no-cache, must-revalidate'

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self';",
}

function shouldSkipCache(pathname: string): boolean {
	return (
		pathname.startsWith('/api/') ||
		pathname === '/preview' ||
		pathname.startsWith('/preview/') ||
		pathname.includes('/_')
	)
}

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next()
	const { pathname } = context.url

	const newHeaders = new Headers(response.headers)
	const isPreview = pathname === '/preview' || pathname.startsWith('/preview/')

	for (const [key, value] of Object.entries(securityHeaders)) {
		if (isPreview && key === 'X-Frame-Options') {
			continue
		}

		if (isPreview && key === 'Content-Security-Policy') {
			newHeaders.set(key, `${value} frame-ancestors 'self';`)
			continue
		}

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
