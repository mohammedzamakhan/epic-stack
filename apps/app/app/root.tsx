import { storeUtmParams } from '@repo/analytics'
import { getImpersonationInfo, getUserId, logout } from '@repo/auth'
import { cache, cachified } from '@repo/cache'
import {
	combineHeaders,
	getDomainUrl,
	getImgSrc,
	useNonce,
	makeTimings,
	time,
} from '@repo/common'
import { getCookieConsentState } from '@repo/common/cookie-consent'
import { pipeHeaders } from '@repo/common/headers'
import { getSidebarState } from '@repo/common/sidebar-cookie'
import { getToast } from '@repo/common/toast'
import { brand, getErrorTitle } from '@repo/config/brand'
import {
	db,
	eq,
	Organization,
	OrganizationNote,
	OrganizationNoteFavorite,
	Permission,
	Role,
	User,
	UserImage,
	_RoleToUser,
	_PermissionToRole,
} from '@repo/database'
import { getDirection } from '@repo/i18n'
import { honeypot } from '@repo/security'
import { generateSeoMeta, generateOrganizationSchema } from '@repo/seo'
import { DirectionProvider } from '@repo/ui'
import { ClientHintCheck, getHints } from '@repo/ui/client-hints'
import { EpicToaster } from '@repo/ui/sonner'
import { TooltipProvider } from '@repo/ui/tooltip'
import { OpenImgContextProvider } from 'openimg/react'
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useRouteLoaderData,
} from 'react-router'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { ENV } from 'varlock/env'
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
import './styles/tailwind.css'
import { getLaunchStatus } from './utils/env.server.ts'
import { seoConfig } from './utils/seo.ts'
import { type Theme, getTheme } from './utils/theme.server.ts'

export const links: Route.LinksFunction = () => {
	return [
		// Preconnect to external services for faster resource loading

		// Preload critical assets
		{ rel: 'preload', href: iconsHref, as: 'image' },

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
	].filter(Boolean)
}

export const meta: Route.MetaFunction = ({ loaderData: data, location }) => {
	// If there's an error, return minimal meta tags
	if (!data) {
		return [
			{ title: getErrorTitle() },
			{ name: 'robots', content: 'noindex, nofollow' },
		]
	}

	// Get domain URL from request info
	const url = data.requestInfo
		? `${data.requestInfo.origin}${location.pathname}`
		: seoConfig.getSiteUrl()

	// Generate comprehensive SEO meta tags with Open Graph and Twitter Cards
	const seoMeta = generateSeoMeta({
		title: brand.name,
		description: brand.description,
		url,
		siteName: brand.name,
		image: seoConfig.getDefaults().image,
		twitter: {
			card: 'summary_large_image',
			site: brand.twitterHandle,
		},
		keywords: [
			'saas',
			'full-stack',
			'react',
			'typescript',
			'notes',
			'organization',
			'productivity',
		],
		robots: {
			index: data.env?.ALLOW_INDEXING !== false,
			follow: data.env?.ALLOW_INDEXING !== false,
			maxImagePreview: 'large',
		},
	})

	return seoMeta
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})
	const locale = await linguiServer.getLocale(request)
	const orgSlug = params.orgSlug

	const user = userId
		? await time(
				() =>
					cachified({
						key: `user:${userId}`,
						cache,
						// Reduced TTL for security-sensitive data (roles/permissions)
						// Cache invalidated on user updates via invalidateUserCache()
						ttl: 1000 * 60 * 1, // 1 minute
						getFreshValue: async () => {
							const [userRow] = await db
								.select({
									id: User.id,
									name: User.name,
									username: User.username,
									objectKey: UserImage.objectKey,
								})
								.from(User)
								.leftJoin(UserImage, eq(UserImage.userId, User.id))
								.where(eq(User.id, userId))
								.limit(1)
							if (!userRow) return null
							const roleRows = await db
								.select({ id: Role.id, name: Role.name })
								.from(_RoleToUser)
								.innerJoin(Role, eq(_RoleToUser.A, Role.id))
								.where(eq(_RoleToUser.B, userId))
							const roles = await Promise.all(
								roleRows.map(async (role) => ({
									name: role.name,
									permissions: await db
										.select({
											entity: Permission.entity,
											action: Permission.action,
											access: Permission.access,
										})
										.from(_PermissionToRole)
										.innerJoin(
											Permission,
											eq(_PermissionToRole.A, Permission.id),
										)
										.where(eq(_PermissionToRole.B, role.id)),
								})),
							)
							return {
								id: userRow.id,
								name: userRow.name,
								username: userRow.username,
								image: userRow.objectKey
									? { objectKey: userRow.objectKey }
									: null,
								roles,
							}
						},
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		// The user is authenticated but we can't find them in the database.
		// Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const honeyProps = await honeypot.getInputProps()
	const requestUrl = new URL(request.url)

	// Get sidebar state for marketing routes
	const isMarketingRoute = requestUrl.pathname.startsWith('/dashboard')
	const sidebarState = isMarketingRoute ? await getSidebarState(request) : null

	// Load user organizations with slug-based switching handled automatically
	const { getUserOrganizationsWithSlugHandling } =
		await import('./utils/organization/organizations.server')
	const userOrganizations = user
		? await getUserOrganizationsWithSlugHandling(user.id, orgSlug)
		: undefined

	const favoriteNotes = user
		? await cachified({
				key: `user-favorites:${user.id}`,
				cache,
				ttl: 1000 * 60 * 2, // 2 minutes
				getFreshValue: async () =>
					db
						.select({
							id: OrganizationNoteFavorite.id,
							noteId: OrganizationNoteFavorite.noteId,
							noteTitle: OrganizationNote.title,
							noteOrganizationId: OrganizationNote.organizationId,
							organizationSlug: Organization.slug,
						})
						.from(OrganizationNoteFavorite)
						.innerJoin(
							OrganizationNote,
							eq(OrganizationNoteFavorite.noteId, OrganizationNote.id),
						)
						.innerJoin(
							Organization,
							eq(OrganizationNote.organizationId, Organization.id),
						)
						.where(eq(OrganizationNoteFavorite.userId, user.id))
						.then((rows) =>
							rows.map((row) => ({
								id: row.id,
								noteId: row.noteId,
								note: {
									id: row.noteId,
									title: row.noteTitle,
									organizationId: row.noteOrganizationId,
									organization: { slug: row.organizationSlug },
								},
							})),
						),
			})
		: undefined

	const requestInfo = {
		hints: getHints(request),
		origin: getDomainUrl(request),
		path: requestUrl.pathname,
		userPrefs: {
			theme: getTheme(request),
		},
		sidebarState,
	}

	// Fetch request-specific data in parallel
	const [
		{ toast, headers: toastHeaders },
		utmResponse,
		impersonationInfo,
		cookieConsent,
	] = await Promise.all([
		getToast(request),
		storeUtmParams(request),
		getImpersonationInfo(request),
		getCookieConsentState(request),
	])

	const utmHeaders = utmResponse?.headers || {}

	return data(
		{
			user,
			requestInfo,
			toast,
			honeyProps,
			locale,
			userOrganizations,
			favoriteNotes,
			impersonationInfo,
			cookieConsent,
			launchStatus: getLaunchStatus(),
			env: {
				NODE_ENV: ENV.NODE_ENV,
				ALLOW_INDEXING: ENV.ALLOW_INDEXING,
			},
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
	env?: Record<string, any>
}) {
	const allowIndexing = env.ALLOW_INDEXING !== false
	const data = useRouteLoaderData<typeof loader>('root')
	const locale = data?.locale ?? 'en'
	const direction = getDirection(locale)

	// Generate Organization structured data for better SEO
	const organizationSchema = generateOrganizationSchema({
		name: brand.companyName,
		url: brand.url,
		description: brand.description,
		email: brand.supportEmail,
		sameAs: brand.twitterHandle
			? [`https://twitter.com/${brand.twitterHandle.replace('@', '')}`]
			: [],
	})

	return (
		<html
			lang={locale ?? 'en'}
			dir={direction}
			className={`${theme} h-full overflow-x-hidden`}
		>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
					}}
				/>
				<Links nonce={nonce} />
			</head>
			<body className="bg-background text-foreground">
				<a
					href="#main-content"
					className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:ring-2"
				>
					Skip to main content
				</a>
				<DirectionProvider direction={direction}>{children}</DirectionProvider>
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env).replace(/</g, '\\u003c')}`,
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
	const nonce = useNonce()
	const theme = useOptionalTheme() || 'dark'

	// For non-marketing routes, use the regular Document with App component
	return (
		<Document nonce={nonce} theme={theme}>
			{children}
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	useToast(data.toast)

	return (
		<HoneypotProvider {...data.honeyProps}>
			<OpenImgContextProvider
				optimizerEndpoint="/resources/images"
				getSrc={getImgSrc}
			>
				{data.impersonationInfo && (
					<ImpersonationBanner impersonationInfo={data.impersonationInfo} />
				)}
				<TooltipProvider>
					<Outlet />
				</TooltipProvider>
				<EpicToaster />
				<CookieConsentBanner consent={data.cookieConsent} />
			</OpenImgContextProvider>
		</HoneypotProvider>
	)
}

export default AppWithProviders

// this is a last resort error boundary. There's not much useful information we
// can offer at this level.
export const ErrorBoundary = GeneralErrorBoundary
