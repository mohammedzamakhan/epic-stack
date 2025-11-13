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
	const fallback = config.fallbackLocales?.default
	if (!fallback) return 'en'
	if (Array.isArray(fallback)) return fallback[0] || 'en'
	return fallback
}

export const linguiServer = new RemixLingui({
	detection: {
		supportedLanguages: config.locales,
		fallbackLanguage: getFallbackLanguage(),
		cookie: localeCookie,
	},
})
