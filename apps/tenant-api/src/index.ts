import 'varlock/auto-load'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { ENV } from 'varlock/env'
import {
	isAllowedAnalyticsOrigin,
	isAllowedBrowserOrigin,
} from './lib/origin.ts'
import { assertDataRegion, getNodeRegion } from './lib/region.ts'
import { assertTenantApiSecrets } from './lib/secrets.ts'
import { analyticsRoutes } from './routes/analytics.ts'
import { authRoutes } from './routes/auth.ts'
import { engagementSyncRoutes } from './routes/engagement-sync.ts'
import {
	journeyOperatorRoutes,
	journeySystemRoutes,
} from './routes/journeys.ts'
import { operatorRoutes } from './routes/operator.ts'
import { provisionRoutes } from './routes/provision.ts'

assertTenantApiSecrets()
assertDataRegion()

const app = new Hono()

app.use('*', logger())

// Browser-facing: Sites auth and App operator pages call tenant-api directly.
// Allow only origins that resolve to an org in THIS region (App origin is always allowed).
app.use('*', async (c, next) => {
	const origin = c.req.header('Origin')
	const analyticsRequest = c.req.path.startsWith('/analytics')
	const allowed = origin
		? analyticsRequest
			? await isAllowedAnalyticsOrigin(origin)
			: await isAllowedBrowserOrigin(origin)
		: false

	if (c.req.method === 'OPTIONS') {
		if (!origin || !allowed) {
			return c.body(null, 403)
		}
		return c.body(null, 204, {
			'Access-Control-Allow-Origin': origin,
			Vary: 'Origin',
			'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '600',
		})
	}

	await next()

	if (origin && allowed) {
		c.res.headers.set('Access-Control-Allow-Origin', origin)
		c.res.headers.append('Vary', 'Origin')
	}
})

app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		service: 'regional-tenant-node',
		region: getNodeRegion(),
		timestamp: new Date().toISOString(),
	})
})

app.route('/auth', authRoutes)
app.route('/analytics', analyticsRoutes)
app.route('/api', provisionRoutes)
app.route('/api/marketing', engagementSyncRoutes)
app.route('/api/journeys', journeySystemRoutes)
app.route('/operator', operatorRoutes)
app.route('/operator/journeys', journeyOperatorRoutes)

app.notFound((c) => {
	return c.json({ error: 'Endpoint Not Found' }, 404)
})

app.onError((err, c) => {
	console.error('Unhandled error in tenant-api:', err)
	return c.json({ error: 'Internal Server Error' }, 500)
})

const port = Number(process.env.PORT || ENV.PORT) || 3007
const region = getNodeRegion()

console.log(
	`Regional Tenant Node (${region}) running on http://localhost:${port}`,
)

serve({
	fetch: app.fetch,
	port,
})
