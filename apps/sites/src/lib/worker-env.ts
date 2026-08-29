import { env as cloudflareWorkerEnv } from 'cloudflare:workers'
import { ENV } from 'varlock/env'

import { type SiteHostEnv } from './resolve-host'

type SitesWorkerConfig = SiteHostEnv & {
	PUBLIC_APP_URL?: string
	TENANT_API_URL?: string
	TENANT_API_URL_KSA?: string
}

function readBinding(key: keyof SitesWorkerConfig): string | undefined {
	const fromWorker =
		cloudflareWorkerEnv[key as keyof typeof cloudflareWorkerEnv]
	if (typeof fromWorker === 'string' && fromWorker.length > 0) {
		return fromWorker
	}

	const fromVarlock = (ENV as SitesWorkerConfig)[key]
	if (typeof fromVarlock === 'string' && fromVarlock.length > 0) {
		return fromVarlock
	}

	return undefined
}

export function getSiteHostEnv(): SiteHostEnv {
	return {
		ROOT_APP: readBinding('ROOT_APP'),
		PUBLIC_SITE_HOST_SUFFIXES: readBinding('PUBLIC_SITE_HOST_SUFFIXES'),
	}
}

export function getPublicAppUrl(): string {
	return (readBinding('PUBLIC_APP_URL') || 'http://localhost:3001').replace(
		/\/$/,
		'',
	)
}

export function getTenantApiUrl(): string {
	return (readBinding('TENANT_API_URL') || 'http://localhost:3007').replace(
		/\/$/,
		'',
	)
}

export function getTenantApiUrlKsa(): string {
	return (readBinding('TENANT_API_URL_KSA') || '').replace(/\/$/, '')
}
