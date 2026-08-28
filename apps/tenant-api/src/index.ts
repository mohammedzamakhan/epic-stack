import 'varlock/auto-load'
import { serve } from '@hono/node-server'
import { ENV } from 'varlock/env'
import { createTenantApiApp } from './app.ts'
import { assertDataRegion, getNodeRegion } from './lib/region.ts'
import { assertTenantApiSecrets } from './lib/secrets.ts'

assertTenantApiSecrets()
assertDataRegion()

const app = createTenantApiApp()

const port = Number(process.env.PORT || ENV.PORT) || 3007
const region = getNodeRegion()

console.log(
	`Regional Tenant Node (${region}) running on http://localhost:${port}`,
)

serve({
	fetch: app.fetch,
	port,
})
