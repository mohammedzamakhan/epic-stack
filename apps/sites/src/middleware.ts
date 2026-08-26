import { resolveSiteLocaleRequest } from '@repo/common/site-locales'
import { defineMiddleware } from 'astro:middleware'
import { ENV } from 'varlock/env'
import { createSiteI18n } from '~/lib/i18n'
import {
	fetchPublishedOrganizationForHost,
	fetchPublishedSitePage,
} from '~/lib/org'
import {
	type SiteHostEnv,
	getSiteHostSuffixes,
	resolveHost,
} from '~/lib/resolve-host'
import { isInlineShopCheckoutEnabled } from '~/lib/shop'
import {
	asAstroResponse,
	edgeCache,
	isSitesAppRoute,
	isSitesProduction,
	publishedHtmlCacheUrl,
	shouldCachePublishedHtml,
	sitesConnectSrc,
	sitesScriptSrc,
	sitesStripeConnectSrc,
	sitesStripeFrameSrc,
	sitesStripeScriptSrc,
} from '~/lib/site-headers'

export {
	resolveHost,
	resolveOrgSlugFromHost,
	type HostResolution,
} from '~/lib/resolve-host'

function siteHostEnv(): SiteHostEnv {
	const env = ENV as SiteHostEnv
	return {
		ROOT_APP: process.env.ROOT_APP || env.ROOT_APP,
		PUBLIC_SITE_HOST_SUFFIXES:
			process.env.PUBLIC_SITE_HOST_SUFFIXES || env.PUBLIC_SITE_HOST_SUFFIXES,
	}
}

const appUrl = (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(
	/\/$/,
	'',
)
const tenantApiUrl = (
	process.env.TENANT_API_URL ||
	ENV.TENANT_API_URL ||
	'http://localhost:3007'
).replace(/\/$/, '')
const tenantApiUrlKsa = (
	process.env.TENANT_API_URL_KSA ||
	ENV.TENANT_API_URL_KSA ||
	''
).replace(/\/$/, '')
const imgSrc = `img-src 'self' data: ${appUrl}`
const fontSrc = `font-src 'self' data: ${appUrl}`
const stripeEnabled = isInlineShopCheckoutEnabled()
const connectSrc = [
	sitesConnectSrc([appUrl, tenantApiUrl, tenantApiUrlKsa]),
	sitesStripeConnectSrc(stripeEnabled),
]
	.filter(Boolean)
	.join(' ')

const isProduction = isSitesProduction()

function securityHeadersFor(env: SiteHostEnv) {
	const frameAncestors = getSiteHostSuffixes(env)
		.flatMap((domain) => [`*.${domain}:*`, `*.${domain}`])
		.join(' ')

	return {
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': [
			"default-src 'self'",
			connectSrc,
			`${sitesScriptSrc(!isProduction)}${sitesStripeScriptSrc(stripeEnabled)}`,
			"style-src 'self' 'unsafe-inline'",
			fontSrc,
			imgSrc,
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			sitesStripeFrameSrc(stripeEnabled),
			`frame-ancestors 'self' ${frameAncestors} localhost:*`,
		]
			.filter(Boolean)
			.join('; '),
		...(isProduction
			? {
					'Strict-Transport-Security':
						'max-age=63072000; includeSubDomains; preload',
				}
			: {}),
	}
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

function withSecurityHeaders(
	response: Response,
	pathname: string,
	env: SiteHostEnv,
	cacheControl?: string,
) {
	const newHeaders = new Headers(response.headers)

	for (const [key, value] of Object.entries(securityHeadersFor(env))) {
		newHeaders.set(key, value)
	}

	if (pathname.startsWith('/api/')) {
		newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate')
	} else if (cacheControl) {
		newHeaders.set('Cache-Control', cacheControl)
	}

	return asAstroResponse(
		new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders,
		}),
	)
}

function waitUntil(context: { locals: App.Locals }, task: Promise<unknown>) {
	const runtime = (
		context.locals as App.Locals & {
			runtime?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } }
		}
	).runtime
	if (runtime?.ctx?.waitUntil) {
		runtime.ctx.waitUntil(task)
		return
	}
	void task
}

export const onRequest = defineMiddleware(async (context, next) => {
	const hostEnv = siteHostEnv()
	const forwardedHost = context.request.headers.get('x-forwarded-host')
	const host = forwardedHost || context.request.headers.get('host')
	const resolved = resolveHost(host, hostEnv)

	context.locals.orgSlug = resolved.kind === 'slug' ? resolved.orgSlug : null
	context.locals.customHost = resolved.kind === 'custom' ? resolved.host : null
	context.locals.requestedLocale ??= 'en'
	context.locals.defaultLocale ??= 'en'
	context.locals.i18n ??= createSiteI18n(context.locals.requestedLocale)
	context.locals.organization = null

	const url = new URL(context.request.url)

	if (isStaticPath(url.pathname)) {
		return withSecurityHeaders(await next(), url.pathname, hostEnv)
	}

	const cache = edgeCache()
	const cacheHtml = shouldCachePublishedHtml(context.request, url, isProduction)
	const cacheKey = new Request(publishedHtmlCacheUrl(url, host).toString(), {
		method: 'GET',
	})
	if (cache && cacheHtml) {
		const cached = await cache.match(cacheKey)
		if (cached?.status === 200) {
			return asAstroResponse(cached)
		}
	}

	let organization = await fetchPublishedOrganizationForHost(
		context.locals.orgSlug,
		context.locals.customHost,
	)

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
			hostEnv,
		)
	}

	if (localeResult.kind === 'redirect') {
		return withSecurityHeaders(
			new Response(null, {
				status: 301,
				headers: { Location: localeResult.location },
			}),
			url.pathname,
			hostEnv,
		)
	}

	context.locals.requestedLocale = localeResult.locale
	context.locals.i18n = createSiteI18n(localeResult.locale)

	if (organization && localeResult.locale !== defaultLocale) {
		organization = await fetchPublishedOrganizationForHost(
			context.locals.orgSlug,
			context.locals.customHost,
			localeResult.locale,
		)
	}
	context.locals.organization = organization

	const routedPathname =
		localeResult.kind === 'rewrite' ? localeResult.pathname : url.pathname
	if (organization && !isSitesAppRoute(routedPathname)) {
		const pageSlug = routedPathname.replace(/^\/+|\/+$/g, '')
		context.locals.publishedPagePromise = fetchPublishedSitePage({
			slug: context.locals.orgSlug,
			host: context.locals.customHost,
			home: pageSlug === '',
			pageSlug: pageSlug || undefined,
			preview: url.searchParams.get('preview') === 'true',
			lng: localeResult.locale,
		})
	}

	// `next(path)` rewrites without re-running this middleware. `context.rewrite()`
	// would start a new render, reset locals, and serve the default locale.
	const response =
		localeResult.kind === 'rewrite'
			? await next(`${localeResult.pathname}${localeResult.search}`)
			: await next()

	const htmlCacheControl = cacheHtml
		? 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
		: undefined
	const secured = withSecurityHeaders(
		response,
		url.pathname,
		hostEnv,
		response.status === 200 ? htmlCacheControl : undefined,
	)

	if (cache && cacheHtml && secured.status === 200) {
		waitUntil(context, cache.put(cacheKey, secured.clone()))
	}

	return secured
})
