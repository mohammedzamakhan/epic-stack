// app/utils/sidebar-cookie.server.ts
import { createCookie } from 'react-router'

export const cookieConsentCookie = createCookie('cconsent', {
	maxAge: 31_536_000, // one year
	sameSite: 'lax',
	path: '/',
	httpOnly: true,
})

export async function getCookieConsentState(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	const cookie = (await cookieConsentCookie.parse(cookieHeader)) || {}
	return cookie.isCollapsed
}

export async function setCookieConsentState(isCollapsed: boolean) {
	return await cookieConsentCookie.serialize({ isCollapsed })
}
