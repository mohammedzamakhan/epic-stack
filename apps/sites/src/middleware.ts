import { resolveSiteLocaleRequest } from '@repo/common/site-locales'
import { brand } from '@repo/config/brand'
import { defineMiddleware } from 'astro:middleware'
import { ENV } from 'varlock/env'
import { createSiteI18n } from '~/lib/i18n'
import {
	fetchPublishedOrganization,
	fetchPublishedOrganizationByHost,
} from '~/lib/org'

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

const appUrl = (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(
	/\/$/,
	'',
)
const tenantApiUrl = (
	ENV.PUBLIC_TENANT_API_URL || 'http://localhost:3007'
).replace(/\/$/, '')
const tenantApiUrlKsa = (
	process.env.PUBLIC_TENANT_API_URL_KSA ||
	ENV.PUBLIC_TENANT_API_URL_KSA ||
	''
).replace(/\/$/, '')
const imgSrc = `img-src 'self' data: ${appUrl}`
const fontSrc = `font-src 'self' data: ${appUrl}`
const connectSrc = ["connect-src 'self'", appUrl, tenantApiUrl, tenantApiUrlKsa]
	.filter(Boolean)
	.join(' ')

const isDev = import.meta.env.DEV

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'Content-Security-Policy': [
		"default-src 'self'",
		connectSrc,
		...(isDev ? ["script-src 'self' 'unsafe-inline' 'unsafe-eval'"] : []),
		"style-src 'self' 'unsafe-inline'",
		fontSrc,
		imgSrc,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		`frame-ancestors 'self' *.${brandDomain}:* *.${brandDomain} localhost:*`,
	].join('; '),
}

export type HostResolution =
	| { kind: 'slug'; orgSlug: string }
	| { kind: 'custom'; host: string }
	| { kind: 'none' }

/**
 * Resolve Host / X-Forwarded-Host to either an org slug subdomain or a custom domain.
 */
export function resolveHost(hostHeader: string | null): HostResolution {
	if (!hostHeader) return { kind: 'none' }

	const hostWithoutPort = hostHeader.split(':')[0]?.toLowerCase() ?? ''
	if (!hostWithoutPort) return { kind: 'none' }

	const suffix = `.${brandDomain}`

	if (hostWithoutPort === brandDomain) {
		return { kind: 'none' }
	}

	if (hostWithoutPort.endsWith(suffix)) {
		const subdomain = hostWithoutPort.slice(0, -suffix.length)
		if (
			!subdomain ||
			subdomain.includes('.') ||
			RESERVED_SUBDOMAINS.has(subdomain)
		) {
			return { kind: 'none' }
		}
		return { kind: 'slug', orgSlug: subdomain }
	}

	return { kind: 'custom', host: hostWithoutPort }
}

/** @deprecated Prefer resolveHost */
export function resolveOrgSlugFromHost(
	hostHeader: string | null,
): string | null {
	const resolved = resolveHost(hostHeader)
	return resolved.kind === 'slug' ? resolved.orgSlug : null
}

function isStaticPath(pathname: string) {
	return (
		pathname.startsWith('/_astro') ||
		pathname.startsWith('/fonts') ||
		pathname.startsWith('/api/') ||
		/\.(?:css|js|mjs|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf)$/i.test(
			pathname,
		)
	)
}

function withSecurityHeaders(response: Response, pathname: string) {
	const newHeaders = new Headers(response.headers)

	for (const [key, value] of Object.entries(securityHeaders)) {
		newHeaders.set(key, value)
	}

	if (pathname.startsWith('/api/')) {
		newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate')
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	})
}

export const onRequest = defineMiddleware(async (context, next) => {
	const forwardedHost = context.request.headers.get('x-forwarded-host')
	const host = forwardedHost || context.request.headers.get('host')
	const resolved = resolveHost(host)

	context.locals.orgSlug = resolved.kind === 'slug' ? resolved.orgSlug : null
	context.locals.customHost = resolved.kind === 'custom' ? resolved.host : null
	context.locals.requestedLocale ??= 'en'
	context.locals.defaultLocale ??= 'en'
	context.locals.i18n ??= createSiteI18n(context.locals.requestedLocale)

	const url = new URL(context.request.url)

	if (isStaticPath(url.pathname)) {
		return withSecurityHeaders(await next(), url.pathname)
	}

	const organization =
		resolved.kind === 'slug'
			? await fetchPublishedOrganization(resolved.orgSlug)
			: resolved.kind === 'custom'
				? await fetchPublishedOrganizationByHost(resolved.host)
				: null

	const enabledLocales = organization?.locales ?? ['en']
	const defaultLocale = organization?.defaultLocale ?? 'en'
	context.locals.defaultLocale = defaultLocale

	const localeResult = resolveSiteLocaleRequest({
		pathname: url.pathname,
		search: url.search,
		enabledLocales,
		defaultLocale,
	})

	if (localeResult.kind === 'not_found') {
		return withSecurityHeaders(
			new Response('Not Found', { status: 404, statusText: 'Not Found' }),
			url.pathname,
		)
	}

	if (localeResult.kind === 'redirect') {
		return withSecurityHeaders(
			new Response(null, {
				status: 301,
				headers: { Location: localeResult.location },
			}),
			url.pathname,
		)
	}

	context.locals.requestedLocale = localeResult.locale
	context.locals.i18n = createSiteI18n(localeResult.locale)

	// `next(path)` rewrites without re-running this middleware. `context.rewrite()`
	// would start a new render, reset locals, and serve the default locale.
	const response =
		localeResult.kind === 'rewrite'
			? await next(`${localeResult.pathname}${localeResult.search}`)
			: await next()

	return withSecurityHeaders(response, url.pathname)
})
