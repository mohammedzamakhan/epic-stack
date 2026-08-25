import { ENV } from 'varlock/env'

/**
 * Regional tenant-api URL for this org.
 *
 * Injected into the page (`data-tenant-api-url`) so the browser calls
 * tenant-api directly. Sites must not proxy customer PII.
 */
export function getTenantApiUrl(dataRegion?: string | null): string {
	const region = (dataRegion || 'us').toLowerCase()
	if (region === 'ksa') {
		const ksaUrl = process.env.TENANT_API_URL_KSA || ENV.TENANT_API_URL_KSA
		if (ksaUrl) {
			return ksaUrl.replace(/\/$/, '')
		}
	}
	return (
		process.env.TENANT_API_URL ||
		ENV.TENANT_API_URL ||
		'http://localhost:3007'
	).replace(/\/$/, '')
}
