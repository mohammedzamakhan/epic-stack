import { ENV } from 'varlock/env'
import { isTenantDataRegion, normalizeTenantDataRegion } from '@repo/tenant-db'
import { syncEnvFromProcess } from './secrets.ts'

export function assertDataRegion() {
	syncEnvFromProcess()
	const raw = (ENV.DATA_REGION || '').toLowerCase()
	if (!isTenantDataRegion(raw)) {
		throw new Error('DATA_REGION must be "us" or "ksa"')
	}
}

export function getNodeRegion() {
	syncEnvFromProcess()
	assertDataRegion()
	return normalizeTenantDataRegion(ENV.DATA_REGION)
}

export function orgMatchesNodeRegion(dataRegion: string | null | undefined) {
	return normalizeTenantDataRegion(dataRegion) === getNodeRegion()
}
