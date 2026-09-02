import { createCookie } from 'react-router'

import {
	operatorCookieName,
	sharedCookieDomain,
} from './cookie-domain.server.ts'

export const cookieConsentCookie = createCookie(
	operatorCookieName('cconsent'),
	{
		maxAge: 31_536_000, // one year
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		domain: sharedCookieDomain(),
	},
)

export async function getCookieConsentState(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	const cookie = (await cookieConsentCookie.parse(cookieHeader)) || {}
	return cookie.isCollapsed
}

export async function setCookieConsentState(isCollapsed: boolean) {
	return await cookieConsentCookie.serialize({ isCollapsed })
}
