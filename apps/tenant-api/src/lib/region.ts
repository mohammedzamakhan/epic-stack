import { ENV } from 'varlock/env'
import { isTenantDataRegion, normalizeTenantDataRegion } from '@repo/tenant-db'

export function assertDataRegion() {
	const raw = (process.env.DATA_REGION || ENV.DATA_REGION || '').toLowerCase()
	if (!isTenantDataRegion(raw)) {
		throw new Error('DATA_REGION must be "us" or "ksa"')
	}
}

export function getNodeRegion() {
	assertDataRegion()
	return normalizeTenantDataRegion(process.env.DATA_REGION || ENV.DATA_REGION)
}

export function orgMatchesNodeRegion(dataRegion: string | null | undefined) {
	return normalizeTenantDataRegion(dataRegion) === getNodeRegion()
}
