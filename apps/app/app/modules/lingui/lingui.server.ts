import { createCookie } from 'react-router'
import config from '../../../lingui.config'
import { RemixLingui } from './remix.server'

export const localeCookie = createCookie('lng', {
	path: '/',
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production',
	httpOnly: true,
})

// Helper to extract fallback language as string
function getFallbackLanguage(): string {
	// Check if fallbackLocales is configured and not false
	if (!config.fallbackLocales || typeof config.fallbackLocales === 'boolean') {
		return 'en'
	}

	const fallback = config.fallbackLocales.default
	if (!fallback) {
		return 'en'
	}

	// Handle array case - return first element
	if (Array.isArray(fallback)) {
		return fallback[0] ?? 'en'
	}

	// Return string directly
	return fallback
}

export const linguiServer = new RemixLingui({
	detection: {
		supportedLanguages: config.locales,
		fallbackLanguage: getFallbackLanguage(),
		cookie: localeCookie,
	},
})
