import { brand } from '@repo/config/brand'
import { defineMiddleware } from 'astro:middleware'

const RESERVED_SUBDOMAINS = new Set([
	'app',
	'admin',
	'cms',
	'docs',
	'studio',
	'api',
	'www',
	'mail',
	'ftp',
	'sites',
	'status',
	'cdn',
	'static',
	'assets',
])

const brandDomain = brand.name.toLowerCase().replace(/\s+/g, '-') + '.me'

// Vite/Astro inject CSS as inline <style> in dev; allow that without opening the app up.
const isDev = import.meta.env.DEV
const contentSecurityPolicy = isDev
	? [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
			"style-src 'self' 'unsafe-inline'",
			"font-src 'self' data:",
			"img-src 'self' data:",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join('; ')
	: [
			"default-src 'self'",
			"style-src 'self' 'unsafe-inline'",
			"font-src 'self' data:",
			"img-src 'self' data:",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join('; ')

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Content-Security-Policy': contentSecurityPolicy,
}

/**
 * Extract org slug from Host / X-Forwarded-Host.
 * Expects `{slug}.{brandDomain}` (e.g. acme.epic-startup.me).
 */
export function resolveOrgSlugFromHost(
	hostHeader: string | null,
): string | null {
	if (!hostHeader) return null

	const hostWithoutPort = hostHeader.split(':')[0]?.toLowerCase() ?? ''
	const suffix = `.${brandDomain}`

	if (!hostWithoutPort.endsWith(suffix)) {
		return null
	}

	const subdomain = hostWithoutPort.slice(0, -suffix.length)
	if (
		!subdomain ||
		subdomain.includes('.') ||
		RESERVED_SUBDOMAINS.has(subdomain)
	) {
		return null
	}

	return subdomain
}

export const onRequest = defineMiddleware(async (context, next) => {
	const forwardedHost = context.request.headers.get('x-forwarded-host')
	const host = forwardedHost || context.request.headers.get('host')
	context.locals.orgSlug = resolveOrgSlugFromHost(host)

	const response = await next()
	const newHeaders = new Headers(response.headers)

	for (const [key, value] of Object.entries(securityHeaders)) {
		newHeaders.set(key, value)
	}

	if (context.url.pathname.startsWith('/api/')) {
		newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate')
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
})
