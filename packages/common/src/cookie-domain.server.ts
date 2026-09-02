const OPERATOR_HOST_LABELS = new Set([
	'app',
	'admin',
	'app-staging',
	'admin-staging',
])

/**
 * Cookie Domain for App/Admin when they run as `app.{apex}` / `admin.{apex}`
 * (production) or `app-staging.{apex}` / `admin-staging.{apex}` (staging).
 *
 * `admin.preview.example.dev` → `.preview.example.dev`
 * `app-staging.example.com` → `.example.com`
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
	if (!subdomain || !OPERATOR_HOST_LABELS.has(subdomain) || parts.length < 3) {
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

export function isStagingOperatorHost(
	hostHeader: string | null | undefined,
): boolean {
	const host = hostHeader?.split(':')[0]?.toLowerCase() ?? ''
	return host.startsWith('app-staging.') || host.startsWith('admin-staging.')
}

export function isStagingOperatorOrigin(origin?: string): boolean {
	if (!origin) return false
	try {
		return isStagingOperatorHost(new URL(origin).hostname)
	} catch {
		return false
	}
}

/** Suffix staging operator cookie names so prod and staging can coexist in one browser. */
export function operatorCookieName(
	baseName: string,
	origin = process.env.BASE_URL,
): string {
	return isStagingOperatorOrigin(origin) ? `${baseName}_staging` : baseName
}

/** Shared theme preference cookie (`en_theme` / `en_theme_staging`). */
export function operatorThemeCookieName(origin = process.env.BASE_URL): string {
	return operatorCookieName('en_theme', origin)
}
