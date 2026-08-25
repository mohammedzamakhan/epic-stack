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

	allowedActionOrigins: [`app.${domain}:2999`],

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
