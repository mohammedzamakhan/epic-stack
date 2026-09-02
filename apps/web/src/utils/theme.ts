// Theme utilities for the Astro marketing site.
// Reads the same operator theme cookie as App/Admin (`en_theme` or `en_theme_staging`).

import { operatorThemeCookieName } from '@repo/common/cookie-domain'

export type Theme = 'light' | 'dark'

export function resolveThemeCookieName(operatorAppUrl?: string): string {
	return operatorThemeCookieName(operatorAppUrl)
}

/**
 * Extract theme from cookie header.
 * @param cookieHeader - The cookie header string from request
 * @param cookieName - Operator theme cookie (`en_theme` or `en_theme_staging`)
 */
export function getThemeFromCookie(
	cookieHeader: string | null,
	cookieName = 'en_theme',
): Theme {
	if (!cookieHeader) return 'dark'

	const cookies = cookieHeader.split(';').reduce(
		(acc, cookie) => {
			const [key, value] = cookie.trim().split('=')
			if (key) acc[key] = value
			return acc
		},
		{} as Record<string, string>,
	)

	const theme = cookies[cookieName]
	if (theme === 'light' || theme === 'dark') return theme
	return 'dark'
}
