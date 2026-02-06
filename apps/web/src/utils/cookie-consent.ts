/**
 * Cookie consent utilities for the Astro web application.
 *
 * The main app (React Router) serialises consent into a `cconsent` cookie via
 * `react-router`'s `createCookie`.  That cookie is Base-64 JSON that may or
 * may not be wrapped in quotes and/or encoded.  The same cookie is shared
 * across sub-domains when `ROOT_APP` is set, so the marketing site can read
 * consent granted on the main app.
 *
 * Because Astro + Cloudflare Workers cannot import `react-router` server
 * utilities, we replicate only the minimal read/write logic needed here.
 */

// ---------------------------------------------------------------------------
// Types (must stay in sync with @repo/common/cookie-consent)
// ---------------------------------------------------------------------------

export const COOKIE_POLICY_VERSION = '1.0'

export type CookieConsentCategory =
	| 'necessary'
	| 'analytics'
	| 'marketing'
	| 'preferences'

export interface CookieConsentPreferences {
	necessary: true
	analytics: boolean
	marketing: boolean
	preferences: boolean
	consentedAt: string
	policyVersion: string
}

// ---------------------------------------------------------------------------
// Cookie name – must match the name used in `createCookie('cconsent', …)`
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'cconsent'

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Parse the raw `Cookie` header and extract consent preferences.
 * Returns `null` if the cookie is absent, unparseable, or the policy version
 * has been bumped since last consent.
 */
export function getConsentFromCookieHeader(
	cookieHeader: string | null,
): CookieConsentPreferences | null {
	if (!cookieHeader) return null

	const raw = extractCookieValue(cookieHeader, COOKIE_NAME)
	if (!raw) return null

	try {
		const parsed = decodeReactRouterCookie(raw)
		if (!parsed || typeof parsed !== 'object') return null

		// Legacy migration: old format was `{ isCollapsed: boolean }`
		if ('isCollapsed' in parsed && !('policyVersion' in parsed)) {
			const accepted = parsed.isCollapsed === true
			return {
				necessary: true,
				analytics: accepted,
				marketing: accepted,
				preferences: accepted,
				consentedAt: new Date().toISOString(),
				policyVersion: COOKIE_POLICY_VERSION,
			}
		}

		if ('policyVersion' in parsed) {
			const prefs = parsed as CookieConsentPreferences
			// Re-prompt if stored version is outdated
			if (prefs.policyVersion !== COOKIE_POLICY_VERSION) return null
			return prefs
		}

		return null
	} catch {
		return null
	}
}

/** Convenience: has the user consented to analytics? */
export function hasAnalyticsConsent(cookieHeader: string | null): boolean {
	return getConsentFromCookieHeader(cookieHeader)?.analytics ?? false
}

/** Convenience: has the user consented to marketing? */
export function hasMarketingConsent(cookieHeader: string | null): boolean {
	return getConsentFromCookieHeader(cookieHeader)?.marketing ?? false
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Build a `Set-Cookie` header string for the consent cookie.
 * Uses the same format that `react-router`'s `createCookie.serialize` would
 * produce: a Base-64-encoded JSON value.
 */
export function buildConsentSetCookie(
	prefs: Omit<CookieConsentPreferences, 'necessary' | 'consentedAt' | 'policyVersion'>,
): string {
	const full: CookieConsentPreferences = {
		necessary: true,
		analytics: prefs.analytics,
		marketing: prefs.marketing,
		preferences: prefs.preferences,
		consentedAt: new Date().toISOString(),
		policyVersion: COOKIE_POLICY_VERSION,
	}

	const encoded = btoa(JSON.stringify(full))
	const rootApp = (import.meta as any).env?.ROOT_APP ?? ''
	const domain = rootApp ? `; Domain=.${rootApp}` : ''

	return [
		`${COOKIE_NAME}=${encoded}`,
		'Path=/',
		'Max-Age=31536000', // 1 year
		'SameSite=Lax',
		'HttpOnly',
		domain,
	]
		.filter(Boolean)
		.join('; ')
}

export function buildAcceptAllCookie(): string {
	return buildConsentSetCookie({
		analytics: true,
		marketing: true,
		preferences: true,
	})
}

export function buildRejectAllCookie(): string {
	return buildConsentSetCookie({
		analytics: false,
		marketing: false,
		preferences: false,
	})
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractCookieValue(
	header: string,
	name: string,
): string | undefined {
	const cookies = header.split(';')
	for (const cookie of cookies) {
		const [key, ...rest] = cookie.trim().split('=')
		if (key === name) {
			return rest.join('=') // value may contain '='
		}
	}
	return undefined
}

/**
 * `react-router`'s `createCookie` serialises values as Base-64-encoded JSON.
 * The value may be URL-encoded and/or double-quoted.
 */
function decodeReactRouterCookie(raw: string): unknown {
	let value = decodeURIComponent(raw)
	// Strip surrounding quotes if present
	if (value.startsWith('"') && value.endsWith('"')) {
		value = value.slice(1, -1)
	}
	// Try Base-64 decode first (current react-router behaviour)
	try {
		return JSON.parse(atob(value))
	} catch {
		// Fallback: plain JSON
		try {
			return JSON.parse(value)
		} catch {
			return null
		}
	}
}
