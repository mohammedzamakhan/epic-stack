/**
 * Flat staging hostnames under the production apex (Universal SSL — no Total TLS).
 *
 * @see docs/decisions/046-staging-hostnames-and-cookies.md
 */

/** @param {string} apex Production zone apex, e.g. `yourdomain.com` */
export function stagingHostnames(apex) {
	const normalized = apex.replace(/^\.+/, '').toLowerCase()
	return {
		root_app_staging: normalized,
		public_app_url_staging: `https://app-staging.${normalized}`,
		public_site_host_suffixes_staging: `${normalized},workers.dev`,
		app_base_url_staging: `https://app-staging.${normalized}`,
		admin_base_url_staging: `https://admin-staging.${normalized}`,
		web_base_url_staging: `https://staging.${normalized}`,
		tenant_api_url_staging: `https://tenant-us-staging.${normalized}`,
		jobs_cron_worker_url_staging: `https://jobs-staging.${normalized}`,
		demo_site_host_staging: `demo-staging.${normalized}`,
	}
}

/** @param {string} apex @param {keyof ReturnType<typeof stagingHostnames>} key */
export function stagingHostname(apex, key) {
	return stagingHostnames(apex)[key]
}
