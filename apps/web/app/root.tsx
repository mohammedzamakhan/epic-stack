import { NovuProvider } from '@novu/react/hooks'
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
import { MarketingDocument } from './components/marketing-document.tsx'
import { href as iconsHref } from './components/ui/icon.tsx'
import { linguiServer, localeCookie } from './modules/lingui/lingui.server.ts'
import { useOptionalTheme } from './routes/resources+/theme-switch.tsx'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { pipeHeaders } from './utils/headers.server.ts'
import { honeypot } from './utils/honeypot.server.ts'
import { combineHeaders, getDomainUrl, getImgSrc } from './utils/misc.tsx'
import { useNonce } from './utils/nonce-provider.ts'
import { getSidebarState } from './utils/sidebar-cookie.server.ts'
import { type Theme, getTheme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { storeUtmParams } from './utils/utm.server.ts'

export const links: Route.LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
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
		} as const, // necessary to make typescript happy
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: Route.MetaFunction = ({ data }) => {
	return [
		{ title: data ? 'Epic Notes' : 'Error | Epic Notes' },
		{ name: 'description', content: `Your own captain's log` },
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

	// Get user organizations if user exists
	let userOrganizations = undefined
	if (user) {
		try {
			const { getUserOrganizations, getUserDefaultOrganization } = await import(
				'./utils/organizations.server'
			)
			const orgs = await getUserOrganizations(user.id)
			const defaultOrg = await getUserDefaultOrganization(user.id)
			userOrganizations = {
				organizations: orgs,
				currentOrganization: defaultOrg,
			}
		} catch (error) {
			console.error('Failed to load user organizations', error)
		}
	}

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

	return data(
		{
			user,
			requestInfo,
			ENV: getEnv(),
			toast,
			honeyProps,
			locale,
			userOrganizations,
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
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string | undefined>
}) {
	const allowIndexing = ENV.ALLOW_INDEXING !== 'false'
	// const { locale } = useLoaderData<typeof loader>()
	const locale = 'en'
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
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

export function Layout({ children }: { children: React.ReactNode }) {
	// if there was an error running the loader, data could be missing
	const data = useLoaderData<typeof loader | null>()
	const nonce = useNonce()
	const theme = useOptionalTheme() || 'light'
	const matches = useMatches()
	const isMarketingRoute = matches.some((match) =>
		match.pathname?.startsWith?.('/app'),
	)

	if (isMarketingRoute) {
		// For marketing routes, only render the MarketingDocument without the App component
		const safeNonce = nonce || ''
		return (
			<MarketingDocument
				locale={data?.locale}
				nonce={safeNonce}
				theme={theme}
				env={data?.ENV || {}}
			>
				{children}
			</MarketingDocument>
		)
	}

	// For non-marketing routes, use the regular Document with App component
	return (
		<Document nonce={nonce} theme={theme} env={data?.ENV}>
			{children}
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	console.log(data.honeyProps)
	return (
		<HoneypotProvider {...data.honeyProps}>
			<OpenImgContextProvider
				optimizerEndpoint="/resources/images"
				getSrc={getImgSrc}
			>
				<NovuProvider
					subscriberId={`${data.userOrganizations?.currentOrganization?.organization.id}_${data.user?.id}`}
					applicationIdentifier="XQdYIaaQAOv5"
				>
					<Outlet />
				</NovuProvider>
			</OpenImgContextProvider>
		</HoneypotProvider>
	)
}

export default AppWithProviders

// this is a last resort error boundary. There's not much useful information we
// can offer at this level.
export const ErrorBoundary = GeneralErrorBoundary
