import { resolveSiteLocaleRequest } from '@repo/common/site-locales'
import { defineMiddleware } from 'astro:middleware'
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
	sitesShopCheckoutConnectSrc,
	sitesShopCheckoutFrameSrc,
	sitesShopCheckoutScriptSrc,
} from '~/lib/site-headers'
import {
	getPublicAppUrl,
	getSiteHostEnv,
	getTenantApiUrl,
	getTenantApiUrlKsa,
} from '~/lib/worker-env'

export {
	resolveHost,
	resolveOrgSlugFromHost,
	type HostResolution,
} from '~/lib/resolve-host'

function siteHostEnv() {
	return getSiteHostEnv()
}

function runtimeUrls() {
	const appUrl = getPublicAppUrl()
	const tenantApiUrl = getTenantApiUrl()
	const tenantApiUrlKsa = getTenantApiUrlKsa()
	return { appUrl, tenantApiUrl, tenantApiUrlKsa }
}

const inlineShopCheckoutEnabled = isInlineShopCheckoutEnabled()
const shopCheckoutCsp = {
	inlineCard: inlineShopCheckoutEnabled,
	hostedEmbed: true,
}

const isProduction = isSitesProduction()

function securityHeadersFor(env: SiteHostEnv) {
	const { appUrl, tenantApiUrl, tenantApiUrlKsa } = runtimeUrls()
	const connectSrc = [
		sitesConnectSrc([appUrl, tenantApiUrl, tenantApiUrlKsa]),
		sitesShopCheckoutConnectSrc(shopCheckoutCsp),
	]
		.filter(Boolean)
		.join(' ')
	const imgSrc = `img-src 'self' data: ${appUrl}`
	const fontSrc = `font-src 'self' data: ${appUrl}`
	const frameAncestors = getSiteHostSuffixes(env)
		.flatMap((domain) => [`*.${domain}:*`, `*.${domain}`])
		.join(' ')

	return {
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': [
			"default-src 'self'",
			connectSrc,
			`${sitesScriptSrc(!isProduction)}${sitesShopCheckoutScriptSrc(shopCheckoutCsp)}`,
			"style-src 'self' 'unsafe-inline'",
			fontSrc,
			imgSrc,
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			sitesShopCheckoutFrameSrc(shopCheckoutCsp),
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

	const existingVary = newHeaders.get('Vary')
	const varyValues = new Set(
		existingVary ? existingVary.split(',').map((v) => v.trim()) : [],
	)
	varyValues.add('Host')
	varyValues.add('Accept-Encoding')
	newHeaders.set('Vary', Array.from(varyValues).join(', '))

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
	const url = new URL(context.request.url)
	const host = context.request.headers.get('host') || url.host
	const resolved = resolveHost(host, hostEnv)

	context.locals.orgSlug = resolved.kind === 'slug' ? resolved.orgSlug : null
	context.locals.customHost = resolved.kind === 'custom' ? resolved.host : null
	context.locals.requestedLocale ??= 'en'
	context.locals.defaultLocale ??= 'en'
	context.locals.i18n ??= createSiteI18n(context.locals.requestedLocale)
	context.locals.organization = null

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
