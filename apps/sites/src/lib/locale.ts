import { getLocaleHref } from '@repo/common/site-locales'

export { getLocaleHref }

export function siteLocaleHref(
	path: string,
	targetLocale?: string | null,
	currentLocale?: string | null,
	defaultLocale: string = 'en',
) {
	return getLocaleHref(path, targetLocale, currentLocale, defaultLocale)
}

export function browserLocaleHref(path: string): string {
	if (typeof document === 'undefined') return path
	const locale = document.documentElement.lang || 'en'
	const defaultLocale = document.documentElement.dataset.defaultLocale || 'en'
	return getLocaleHref(path, locale, locale, defaultLocale)
}
