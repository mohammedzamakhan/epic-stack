import { type Config } from '@react-router/dev/config'
import { getBrandDomain } from '@repo/config/brand'
import { sentryOnBuildEnd } from '@sentry/react-router'

const MODE = process.env.NODE_ENV
const domain = getBrandDomain()

export default {
	// Defaults to true. Set to false to enable SPA for all routes.
	ssr: true,

	routeDiscovery: { mode: 'initial' },

	future: {
		unstable_optimizeDeps: true,
	},

	// Dev proxy (admin.{domain}:2999 → localhost:3005) forwards a different Origin
	// than the backend Host header; allow the public dev origin for fetcher actions.
	allowedActionOrigins: [`admin.${domain}:2999`],

	buildEnd: async ({ viteConfig, reactRouterConfig, buildManifest }) => {
		if (MODE === 'production' && process.env.SENTRY_AUTH_TOKEN) {
			await sentryOnBuildEnd({
				viteConfig,
				reactRouterConfig,
				buildManifest,
			})
		}
	},
} satisfies Config
