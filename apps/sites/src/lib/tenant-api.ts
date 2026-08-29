import {
	getTenantApiUrl as getUsTenantApiUrl,
	getTenantApiUrlKsa,
} from '~/lib/worker-env'

/**
 * Regional tenant-api URL for this org.
 *
 * Injected into the page (`data-tenant-api-url`) so the browser calls
 * tenant-api directly. Sites must not proxy customer PII.
 */
export function getTenantApiUrl(dataRegion?: string | null): string {
	const region = (dataRegion || 'us').toLowerCase()
	if (region === 'ksa') {
		const ksaUrl = getTenantApiUrlKsa()
		if (ksaUrl) return ksaUrl
	}
	return getUsTenantApiUrl()
}
