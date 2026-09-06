import { type Config } from '@react-router/dev/config'
import { getLocalDomain } from '@repo/config/brand'

const domain = getLocalDomain()
const isCloudflare = process.env.DEPLOY_TARGET === 'cloudflare'

export default {
	// Defaults to true. Set to false to enable SPA for all routes.
	ssr: true,

	routeDiscovery: { mode: 'initial' },

	future: {
		unstable_optimizeDeps: true,
	},

	// Dev proxy (admin.{domain}:2999 → localhost:3005) forwards a different Origin
	// than the backend Host header; allow the public dev origin for fetcher actions.
	allowedActionOrigins: isCloudflare ? [] : [`admin.${domain}:2999`],
} satisfies Config
