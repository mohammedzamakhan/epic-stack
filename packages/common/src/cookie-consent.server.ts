import { createCookie } from 'react-router'

/**
 * Current cookie policy version. Bump this when the cookie policy changes
 * materially (e.g. new categories, new third-party processors). When the
 * version stored in the user's cookie is older than this value the consent
 * banner will be re-shown so the user can re-consent.
 */
export const COOKIE_POLICY_VERSION = '1.0'

/** Cookie consent categories following GDPR/ePrivacy requirements. */
export type CookieConsentCategory =
	| 'necessary'
	| 'analytics'
	| 'marketing'
	| 'preferences'

/** Structured consent preferences persisted in the cookie. */
export interface CookieConsentPreferences {
	/** Always true -- essential cookies cannot be disabled. */
	necessary: true
	/** Whether the user consented to analytics cookies. */
	analytics: boolean
	/** Whether the user consented to marketing / UTM tracking cookies. */
	marketing: boolean
	/** Whether the user consented to preference cookies (theme, sidebar, etc.). */
	preferences: boolean
	/** ISO-8601 timestamp of when consent was given or last updated. */
	consentedAt: string
	/** The policy version the user consented to. */
	policyVersion: string
}

export const cookieConsentCookie = createCookie('cconsent', {
	maxAge: 31_536_000, // one year
	sameSite: 'lax',
	path: '/',
	httpOnly: true,
	domain: process.env.ROOT_APP ? `.${process.env.ROOT_APP}` : undefined,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the raw cookie value, handling migration from the legacy
 * `{ isCollapsed: boolean }` format to the new structured format.
 */
async function parseCookie(
	request: Request,
): Promise<CookieConsentPreferences | null> {
	const cookieHeader = request.headers.get('Cookie')
	const raw = await cookieConsentCookie.parse(cookieHeader)

	if (!raw || typeof raw !== 'object') return null

	// --- Legacy migration ---------------------------------------------------
	// The old implementation only stored `{ isCollapsed: boolean }`. If we
	// detect that shape we treat "accept" (isCollapsed = true after clicking
	// Accept) as full consent, and anything else as no consent.
	if ('isCollapsed' in raw && !('policyVersion' in raw)) {
		const accepted = raw.isCollapsed === true
		return {
			necessary: true,
			analytics: accepted,
			marketing: accepted,
			preferences: accepted,
			consentedAt: new Date().toISOString(),
			policyVersion: COOKIE_POLICY_VERSION,
		}
	}

	// --- Current format -----------------------------------------------------
	if ('policyVersion' in raw) {
		return raw as CookieConsentPreferences
	}

	return null
}

// ---------------------------------------------------------------------------
// Public API -- reading consent
// ---------------------------------------------------------------------------

/**
 * Return the full structured consent state, or `null` if the user has not
 * consented yet (or the policy version has been bumped since last consent).
 */
export async function getConsentPreferences(
	request: Request,
): Promise<CookieConsentPreferences | null> {
	const prefs = await parseCookie(request)
	if (!prefs) return null

	// Re-prompt if the stored version is outdated.
	if (prefs.policyVersion !== COOKIE_POLICY_VERSION) return null

	return prefs
}

/** Convenience: has the user given *any* consent (banner dismissed)? */
export async function hasConsented(request: Request): Promise<boolean> {
	return (await getConsentPreferences(request)) !== null
}

/** Convenience: did the user consent to the analytics category? */
export async function hasAnalyticsConsent(request: Request): Promise<boolean> {
	const prefs = await getConsentPreferences(request)
	return prefs?.analytics ?? false
}

/** Convenience: did the user consent to the marketing category? */
export async function hasMarketingConsent(request: Request): Promise<boolean> {
	const prefs = await getConsentPreferences(request)
	return prefs?.marketing ?? false
}

/** Convenience: did the user consent to the preferences category? */
export async function hasPreferencesConsent(
	request: Request,
): Promise<boolean> {
	const prefs = await getConsentPreferences(request)
	return prefs?.preferences ?? false
}

// ---------------------------------------------------------------------------
// Public API -- writing consent
// ---------------------------------------------------------------------------

/**
 * Serialize a full `CookieConsentPreferences` object into a Set-Cookie
 * header value.
 */
export async function setConsentPreferences(
	prefs: Omit<CookieConsentPreferences, 'necessary' | 'consentedAt' | 'policyVersion'>,
) {
	const full: CookieConsentPreferences = {
		necessary: true,
		analytics: prefs.analytics,
		marketing: prefs.marketing,
		preferences: prefs.preferences,
		consentedAt: new Date().toISOString(),
		policyVersion: COOKIE_POLICY_VERSION,
	}
	return await cookieConsentCookie.serialize(full)
}

/** Accept all optional categories. */
export async function setConsentAcceptAll() {
	return setConsentPreferences({
		analytics: true,
		marketing: true,
		preferences: true,
	})
}

/** Reject all optional categories (only necessary cookies). */
export async function setConsentRejectAll() {
	return setConsentPreferences({
		analytics: false,
		marketing: false,
		preferences: false,
	})
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases (deprecated -- will be removed in v2)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `hasConsented()` or `getConsentPreferences()` instead.
 */
export async function getCookieConsentState(request: Request) {
	return await hasConsented(request)
}

/**
 * @deprecated Use `setConsentPreferences()`, `setConsentAcceptAll()`, or
 * `setConsentRejectAll()` instead.
 */
export async function setCookieConsentState(isCollapsed: boolean) {
	if (isCollapsed) {
		return await setConsentAcceptAll()
	}
	return await setConsentRejectAll()
}
