// Theme utilities for Astro web application
// Reads the en_theme cookie set by the main app

const THEME_COOKIE_NAME = 'en_theme'

export type Theme = 'light' | 'dark'

/**
 * Extract theme from cookie header
 * @param cookieHeader - The cookie header string from request
 * @returns The theme ('light' or 'dark'), defaults to 'dark'
 */
export function getThemeFromCookie(cookieHeader: string | null): Theme {
	if (!cookieHeader) return 'dark'

	const cookies = cookieHeader.split(';').reduce(
		(acc, cookie) => {
			const [key, value] = cookie.trim().split('=')
			if (key) acc[key] = value
			return acc
		},
		{} as Record<string, string>,
	)

	const theme = cookies[THEME_COOKIE_NAME]
	if (theme === 'light' || theme === 'dark') return theme
	return 'dark'
}
