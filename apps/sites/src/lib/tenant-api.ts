import { ENV } from 'varlock/env'

/**
 * Public URL of the regional tenant-api for this org.
 *
 * Injected into the page so the **browser** can call tenant-api directly.
 * Sites (often US) must not proxy customer PII — that would leave the org's
 * data region.
 */
export function getTenantApiUrl(dataRegion?: string | null): string {
	const region = (dataRegion || 'us').toLowerCase()
	if (region === 'ksa') {
		const ksaUrl =
			process.env.PUBLIC_TENANT_API_URL_KSA || ENV.PUBLIC_TENANT_API_URL_KSA
		if (ksaUrl) {
			return ksaUrl.replace(/\/$/, '')
		}
	}
	return (ENV.PUBLIC_TENANT_API_URL || 'http://localhost:3007').replace(
		/\/$/,
		'',
	)
}
