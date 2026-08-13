/**
 * Public org site content locales (independent of admin app Lingui locales).
 */

export const SITE_CONTENT_LOCALES = [
	'en',
	'ar',
	'zh',
	'es',
	'fr',
	'de',
	'hi',
	'pt',
	'ja',
	'ko',
	'it',
	'nl',
	'pl',
	'ru',
	'tr',
	'he',
	'fa',
	'ur',
	'id',
	'vi',
	'th',
	'sv',
	'da',
	'fi',
	'no',
	'cs',
	'ro',
	'uk',
] as const

export type SiteContentLocale = (typeof SITE_CONTENT_LOCALES)[number]

export const SITE_CONTENT_LOCALE_LABELS: Record<SiteContentLocale, string> = {
	en: 'English',
	ar: 'Arabic',
	zh: 'Chinese',
	es: 'Spanish',
	fr: 'French',
	de: 'German',
	hi: 'Hindi',
	pt: 'Portuguese',
	ja: 'Japanese',
	ko: 'Korean',
	it: 'Italian',
	nl: 'Dutch',
	pl: 'Polish',
	ru: 'Russian',
	tr: 'Turkish',
	he: 'Hebrew',
	fa: 'Persian',
	ur: 'Urdu',
	id: 'Indonesian',
	vi: 'Vietnamese',
	th: 'Thai',
	sv: 'Swedish',
	da: 'Danish',
	fi: 'Finnish',
	no: 'Norwegian',
	cs: 'Czech',
	ro: 'Romanian',
	uk: 'Ukrainian',
}

export const RTL_SITE_LOCALES = new Set<SiteContentLocale>([
	'ar',
	'he',
	'fa',
	'ur',
])

export type SiteLocalesConfig = {
	locales: SiteContentLocale[]
	defaultLocale: SiteContentLocale
}

export const DEFAULT_SITE_LOCALES: SiteLocalesConfig = {
	locales: ['en'],
	defaultLocale: 'en',
}

/** Locale-keyed copy, e.g. { en: "Hello", ar: "مرحبا" } */
export type LocalizedString = Partial<Record<SiteContentLocale, string>> &
	Record<string, string | undefined>

export function isSiteContentLocale(
	value: unknown,
): value is SiteContentLocale {
	return (
		typeof value === 'string' &&
		(SITE_CONTENT_LOCALES as readonly string[]).includes(value)
	)
}

export function getSiteLocaleLabel(locale: string): string {
	if (isSiteContentLocale(locale)) return SITE_CONTENT_LOCALE_LABELS[locale]
	return locale
}

export function getSiteLocaleDirection(locale: string): 'ltr' | 'rtl' {
	return isSiteContentLocale(locale) && RTL_SITE_LOCALES.has(locale)
		? 'rtl'
		: 'ltr'
}

export function parseSiteLocalesConfig(
	localesRaw: string | null | undefined,
	defaultLocaleRaw: string | null | undefined,
): SiteLocalesConfig {
	let locales: SiteContentLocale[] = [...DEFAULT_SITE_LOCALES.locales]

	if (localesRaw) {
		try {
			const parsed: unknown = JSON.parse(localesRaw)
			if (Array.isArray(parsed)) {
				const filtered = parsed.filter(isSiteContentLocale)
				if (filtered.length > 0) {
					locales = Array.from(new Set(filtered))
				}
			}
		} catch {
			/* keep default */
		}
	}

	const defaultLocale = isSiteContentLocale(defaultLocaleRaw)
		? defaultLocaleRaw
		: DEFAULT_SITE_LOCALES.defaultLocale

	if (!locales.includes(defaultLocale)) {
		locales = [defaultLocale, ...locales]
	}

	return { locales, defaultLocale }
}

export function serializeSiteLocales(locales: SiteContentLocale[]): string {
	const unique = Array.from(new Set(locales.filter(isSiteContentLocale)))
	return JSON.stringify(unique.length > 0 ? unique : ['en'])
}

/**
 * Parse a localized string field. Accepts legacy plain strings and JSON maps.
 */
export function parseLocalizedString(
	raw: string | null | undefined,
	fallbackLocale: string = 'en',
): LocalizedString {
	if (!raw) return {}

	const trimmed = raw.trim()
	if (!trimmed) return {}

	if (trimmed.startsWith('{')) {
		try {
			const parsed: unknown = JSON.parse(trimmed)
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				const result: LocalizedString = {}
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof value === 'string' && value.trim()) {
						result[key] = value
					}
				}
				return result
			}
		} catch {
			/* treat as plain string */
		}
	}

	return { [fallbackLocale]: raw }
}

export function serializeLocalizedString(map: LocalizedString): string {
	const cleaned: Record<string, string> = {}
	for (const [key, value] of Object.entries(map)) {
		const trimmed = value?.trim()
		if (trimmed) cleaned[key] = trimmed
	}
	return JSON.stringify(cleaned)
}

/**
 * Resolve visitor-facing copy: exact locale → language base → default → first value.
 */
export function pickLocalized(
	map: LocalizedString | string | null | undefined,
	locale: string | null | undefined,
	defaultLocale: string,
): string {
	const normalized =
		typeof map === 'string'
			? parseLocalizedString(map, defaultLocale)
			: (map ?? {})

	const candidates = [
		locale,
		locale?.split('-')[0],
		defaultLocale,
		defaultLocale.split('-')[0],
	].filter(Boolean) as string[]

	for (const candidate of candidates) {
		const value = normalized[candidate]?.trim()
		if (value) return value
	}

	for (const value of Object.values(normalized)) {
		const trimmed = value?.trim()
		if (trimmed) return trimmed
	}

	return ''
}

/**
 * Read a locale value for form editing without trimming.
 * Preserves leading/trailing spaces while the user is typing.
 */
export function getLocalizedEditableValue(
	map: LocalizedString | string | null | undefined,
	locale: string | null | undefined,
	defaultLocale: string,
): string {
	if (map == null) return ''

	let normalized: LocalizedString = {}

	if (typeof map === 'string') {
		const trimmed = map.trim()
		if (!trimmed) return map
		if (!trimmed.startsWith('{')) return map

		try {
			const parsed: unknown = JSON.parse(trimmed)
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
				return map
			}
			for (const [key, value] of Object.entries(parsed)) {
				if (typeof value === 'string') {
					normalized[key] = value
				}
			}
		} catch {
			return map
		}
	} else {
		normalized = map
	}

	const candidates = [
		locale,
		locale?.split('-')[0],
		defaultLocale,
		defaultLocale.split('-')[0],
	].filter(Boolean) as string[]

	for (const candidate of candidates) {
		const value = normalized[candidate]
		if (typeof value === 'string') return value
	}

	for (const value of Object.values(normalized)) {
		if (typeof value === 'string') return value
	}

	return ''
}

/**
 * Pick the best supported locale from an Accept-Language / preference list.
 */
export function negotiateSiteLocale(
	preferred: string | string[] | null | undefined,
	supported: SiteContentLocale[],
	defaultLocale: SiteContentLocale,
): SiteContentLocale {
	const prefs = Array.isArray(preferred)
		? preferred
		: preferred
			? [preferred]
			: []

	for (const pref of prefs) {
		const exact = pref.toLowerCase()
		const base = exact.split('-')[0] ?? exact
		const match =
			supported.find((locale) => locale === exact) ??
			supported.find((locale) => locale === base)
		if (match) return match
	}

	return supported.includes(defaultLocale)
		? defaultLocale
		: (supported[0] ?? 'en')
}
