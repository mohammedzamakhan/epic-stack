/// <reference types="@cloudflare/workers-types" />

import './polyfill-crypto.ts'
import { bindCacheKV } from '@repo/cache'
import { bindCloudflareD1 } from '@repo/database'
import * as Sentry from '@sentry/cloudflare'
import {
	createContext,
	createRequestHandler,
	RouterContextProvider,
} from 'react-router'
import { initVarlockEnv } from 'varlock/env'
import { ensureLinguiRequestLocale } from '../app/modules/lingui/lingui.server.ts'
import { bindTenantApiService } from '../app/utils/tenant-api-service.server.ts'

const cloudflareContext = createContext<{
	env: Env
	ctx: ExecutionContext
}>()

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
)

function applyWorkerEnv(env: Env) {
	const existingConfig = (globalThis as any).__varlockLoadedEnv?.config ?? {}
	const newConfig: Record<string, { value: unknown }> = { ...existingConfig }
	for (const [key, value] of Object.entries(env)) {
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			newConfig[key] = { value: String(value) }
			if (typeof process !== 'undefined' && process.env) {
				process.env[key] = String(value)
			}
		}
	}
	;(globalThis as any).__varlockLoadedEnv = {
		...(globalThis as any).__varlockLoadedEnv,
		config: newConfig,
	}
	initVarlockEnv({ allowFail: true })
}

function sentryOptions(env: Env) {
	const dsn = env.SENTRY_DSN
	const enabled = Boolean(dsn && dsn !== 'your-dsn' && dsn.includes('@'))
	return {
		dsn: enabled ? dsn : undefined,
		environment: env.NODE_ENV || 'production',
		tracesSampleRate: enabled ? 1 : 0,
	}
}

export default Sentry.withSentry(sentryOptions, {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		// Wrangler bindings must win over varlock's build-time .env snapshot
		// so cookie Domain / BASE_URL match this workers.dev preview.
		applyWorkerEnv(env)
		bindCloudflareD1(env.DB)
		bindCacheKV(env.CACHE)
		if ((env as any).TENANT_API) {
			bindTenantApiService((env as any).TENANT_API)
		}
		await ensureLinguiRequestLocale(request)

		const loadContext = new RouterContextProvider()
		loadContext.set(cloudflareContext, { env, ctx })

		return requestHandler(request, loadContext)
	},
}) satisfies ExportedHandler<Env>
