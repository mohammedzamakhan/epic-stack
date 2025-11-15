import { NovuProvider } from '@novu/react/hooks'
import { brand, getErrorTitle } from '@repo/config/brand'
import { EpicToaster, TooltipProvider } from '@repo/ui'
import { OpenImgContextProvider } from 'openimg/react'
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useMatches,
} from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { type Route } from './+types/root.ts'
import appleTouchIconAssetUrl from './assets/favicons/apple-touch-icon.png'
import faviconAssetUrl from './assets/favicons/favicon.svg'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { ImpersonationBanner } from './components/impersonation-banner.tsx'
import { CookieConsentBanner } from './components/privacy-banner.tsx'
import { useToast } from './components/toaster.tsx'
import iconsHref from './components/ui/icons/sprite.svg?url'
import { linguiServer, localeCookie } from './modules/lingui/lingui.server.ts'
import { useOptionalTheme } from './routes/resources+/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { cache, cachified } from './utils/cache.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { getCookieConsentState } from './utils/cookie-consent.server.ts'
import { prisma } from './utils/db.server.ts'
import { getEnv, getLaunchStatus } from './utils/env.server.ts'
import { pipeHeaders } from './utils/headers.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { getImpersonationInfo } from './utils/impersonation.server.ts'
import { combineHeaders, getDomainUrl, getImgSrc } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { getSidebarState } from './utils/sidebar-cookie.server.ts'
import { type Theme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { storeUtmParams } from './utils/utm.server.ts'

export const links: Route.LinksFunction = () => {
	return [
		// Preconnect to external services for faster resource loading
		{ rel: 'preconnect', href: 'https://api.novu.co' },
		{ rel: 'preconnect', href: 'https://ws.novu.co' },
		{ rel: 'dns-prefetch', href: 'https://api.novu.co' },

		// Preload critical assets
		{ rel: 'preload', href: iconsHref, as: 'image' },
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },

		// Favicons
		{
			rel: 'icon',
			href: '/favicon.ico',
			sizes: '48x48',
		},
		{ rel: 'icon', type: 'image/svg+xml', href: faviconAssetUrl },
		{ rel: 'apple-touch-icon', href: appleTouchIconAssetUrl },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const,

		// Stylesheet
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: Route.MetaFunction = ({ data }) => {
	return [
		{ title: data ? brand.name : getErrorTitle() },
		{ name: 'description', content: brand.products.app.description },
	]
}

export async function loader({ request }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})
	const locale = await linguiServer.getLocale(request)

	const user = userId
		? await time(
				() =>
					cachified({
						key: `user:${userId}`,
						cache,
						// Reduced TTL for security-sensitive data (roles/permissions)
						// Cache invalidated on user updates via invalidateUserCache()
						ttl: 1000 * 60 * 1, // 1 minute
						getFreshValue: () =>
							prisma.user.findUnique({
								select: {
									id: true,
									name: true,
									username: true,
									image: { select: { objectKey: true } },
									roles: {
										select: {
											name: true,
											permissions: {
												select: { entity: true, action: true, access: true },
											},
										},
									},
								},
								where: { id: userId },
							}),
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const honeyProps = await honeypot.getInputProps()
	const requestUrl = new URL(request.url)

	// Get sidebar state for marketing routes
	const isMarketingRoute = requestUrl.pathname.startsWith('/dashboard')
	const sidebarState = isMarketingRoute ? await getSidebarState(request) : null

	// Defer loading of user organizations to improve initial page load
	// These will be loaded on-demand in routes that need them
	const userOrganizationsPromise = user
		? (async () => {
				try {
					const { getUserOrganizations, getUserDefaultOrganization } =
						await import('./utils/organizations.server')
					const orgs = await getUserOrganizations(user.id, true)
					const defaultOrg = await getUserDefaultOrganization(user.id)
					return {
						organizations: orgs,
						currentOrganization: defaultOrg || orgs[0],
					}
				} catch (error) {
					console.error('Failed to load user organizations', error)
					return undefined
				}
			})()
		: Promise.resolve(undefined)

	// Load organizations but don't await - cache for later use
	const userOrganizations = await cachified({
		key: `user-organizations:${user?.id}`,
		cache,
		ttl: 1000 * 60 * 2, // 2 minutes
		getFreshValue: () => userOrganizationsPromise,
	})

	// Defer favorite notes loading - not critical for initial render
	// These are typically only needed in the sidebar/navigation
	const favoriteNotes = undefined

	const requestInfo = {
		hints: getHints(request),
		origin: getDomainUrl(request),
		path: requestUrl.pathname,
		userPrefs: {
			theme: getTheme(request),
		},
		sidebarState,
	}
	const { toast, headers: toastHeaders } = await getToast(request)

	// Handle UTM parameters if present in the URL
	const utmResponse = await storeUtmParams(request)
	const utmHeaders = utmResponse?.headers || {}

	// Get impersonation info if user is an admin
	const impersonationInfo = await getImpersonationInfo(request)

	const cookieConsent = await getCookieConsentState(request)

	return data(
		{
			user,
			requestInfo,
			ENV: getEnv(),
			toast,
			honeyProps,
			locale,
			userOrganizations,
			favoriteNotes,
			impersonationInfo,
			cookieConsent,
			launchStatus: getLaunchStatus(),
		},
		{
			headers: combineHeaders(
				{
					'Server-Timing': timings.toString(),
					'Set-Cookie': await localeCookie.serialize(locale),
				},
				toastHeaders,
				utmHeaders,
			),
		},
	)
}

export const headers: Route.HeadersFunction = pipeHeaders

function Document({
	children,
	nonce,
	theme = 'dark',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string | undefined>
}) {
	const allowIndexing = ENV.ALLOW_INDEXING !== 'false'
	const { locale } = useLoaderData<typeof loader>()

	return (
		<html lang={locale ?? 'en'} className={`${theme} h-full overflow-x-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				{/* Load scripts with optimal timing - defer non-critical scripts */}
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

export function Layout({ children }: { children: React.ReactNode }) {
	// if there was an error running the loader, data could be missing
	const data = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = useOptionalTheme() || 'dark'
	useMatches()

	// For non-marketing routes, use the regular Document with App component
	return (
		<Document nonce={nonce} theme={theme} env={data?.ENV}>
			{children}
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	useToast(data.toast)

	// Only load NovuProvider if user is logged in and has an organization
	const shouldLoadNovu =
		data.user &&
		data.userOrganizations?.currentOrganization?.organization?.id

	return (
		<HoneypotProvider {...data.honeyProps}>
			<OpenImgContextProvider
				optimizerEndpoint="/resources/images"
				getSrc={getImgSrc}
			>
				{shouldLoadNovu ? (
					<NovuProvider
						subscriberId={`${data.userOrganizations?.currentOrganization?.organization.id}_${data.user?.id}`}
						applicationIdentifier="XQdYIaaQAOv5"
					>
						{data.impersonationInfo && (
							<ImpersonationBanner impersonationInfo={data.impersonationInfo} />
						)}
						<TooltipProvider>
							<Outlet />
						</TooltipProvider>
						<EpicToaster />
						<CookieConsentBanner consent={data.cookieConsent} />
					</NovuProvider>
				) : (
					<>
						{data.impersonationInfo && (
							<ImpersonationBanner impersonationInfo={data.impersonationInfo} />
						)}
						<TooltipProvider>
							<Outlet />
						</TooltipProvider>
						<EpicToaster />
						<CookieConsentBanner consent={data.cookieConsent} />
					</>
				)}
			</OpenImgContextProvider>
		</HoneypotProvider>
	)
}

export default AppWithProviders

// this is a last resort error boundary. There's not much useful information we
// can offer at this level.
export const ErrorBoundary = GeneralErrorBoundary
