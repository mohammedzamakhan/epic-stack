import * as cookie from 'cookie'
import { ENV } from '#app/utils/env.server.ts'

const cookieName = 'en_theme'
export type Theme = 'light' | 'dark'

export function getTheme(request: Request): Theme | null {
	const cookieHeader = request.headers.get('cookie')
	const parsed = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : 'dark'
	if (parsed === 'light' || parsed === 'dark') return parsed
	return null
}

export function setTheme(theme: Theme | 'system') {
	const cookieOptions = {
		path: '/',
		...(ENV.ROOT_APP && { domain: `.${ENV.ROOT_APP}` }),
		sameSite: 'lax' as const,
	}

	if (theme === 'system') {
		return cookie.serialize(cookieName, '', {
			...cookieOptions,
			maxAge: -1,
		})
	} else {
		return cookie.serialize(cookieName, theme, {
			...cookieOptions,
			maxAge: 31536000,
		})
	}
}
