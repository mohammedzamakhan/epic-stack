import { createCookie } from 'react-router'
import config from '../../../lingui.config'
import { RemixLingui } from './remix.server'

export const localeCookie = createCookie('lng', {
	path: '/',
	sameSite: 'lax',
	secure: process.env.NODE_ENV === 'production',
	httpOnly: true,
})

export const linguiServer = new RemixLingui({
	detection: {
		supportedLanguages: config.locales,
		fallbackLanguage: (() => {
			const fallback =
				(!!config.fallbackLocales && config.fallbackLocales?.default) || 'en'
			// Handle case where fallback is an array
			return Array.isArray(fallback) ? fallback[0] : fallback
		})(),
		cookie: localeCookie,
	},
})
