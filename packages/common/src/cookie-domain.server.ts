const OPERATOR_SUBDOMAINS = new Set(['app', 'admin'])

/**
 * Cookie Domain for App/Admin when they run as `app.{apex}` / `admin.{apex}`.
 *
 * `admin.preview.example.dev` → `.preview.example.dev`
 * `localhost` / workers.dev previews → omit (host-only cookie)
 */
export function sharedCookieDomainFromHost(
	hostHeader: string | null | undefined,
): string | undefined {
	const host = hostHeader?.split(':')[0]?.toLowerCase() ?? ''
	if (!host || host === '127.0.0.1') return undefined
	if (host === 'localhost') return undefined
	if (host.endsWith('.localhost')) return '.localhost'

	const parts = host.split('.').filter(Boolean)
	const subdomain = parts[0]
	if (!subdomain || !OPERATOR_SUBDOMAINS.has(subdomain) || parts.length < 3) {
		return undefined
	}

	return `.${parts.slice(1).join('.')}`
}

export function sharedCookieDomain(
	origin = process.env.BASE_URL,
): string | undefined {
	if (!origin) return undefined
	try {
		return sharedCookieDomainFromHost(new URL(origin).host)
	} catch {
		return undefined
	}
}
