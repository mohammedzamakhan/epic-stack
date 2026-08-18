export const TENANT_DATA_REGIONS = ['us', 'ksa'] as const

export const DEFAULT_TENANT_DATA_REGION = 'us'

export type TenantDataRegion = (typeof TENANT_DATA_REGIONS)[number]

export const TENANT_ORG_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export function isTenantDataRegion(value: string): value is TenantDataRegion {
	return (TENANT_DATA_REGIONS as readonly string[]).includes(value)
}

export function normalizeTenantDataRegion(value: string | null | undefined) {
	const region = (value || DEFAULT_TENANT_DATA_REGION).toLowerCase()
	if (!isTenantDataRegion(region)) {
		return DEFAULT_TENANT_DATA_REGION
	}
	return region
}
