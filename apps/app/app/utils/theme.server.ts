import * as cookie from 'cookie'

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
		...(process.env.ROOT_APP && { domain: `.${process.env.ROOT_APP}` }),
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
