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

	allowedActionOrigins: isCloudflare ? [] : [`app.${domain}:2999`],
} satisfies Config
