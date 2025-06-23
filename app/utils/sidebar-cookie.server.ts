// app/utils/sidebar-cookie.server.ts
import { createCookie } from 'react-router'

export const sidebarCookie = createCookie('sidebar-state', {
	maxAge: 31_536_000, // one year
	sameSite: 'lax',
	path: '/',
	httpOnly: true,
})

export async function getSidebarState(request: Request) {
	const cookieHeader = request.headers.get('Cookie')
	const cookie = (await sidebarCookie.parse(cookieHeader)) || {}
	return cookie.isCollapsed ?? false
}

export async function setSidebarState(isCollapsed: boolean) {
	return await sidebarCookie.serialize({ isCollapsed })
}
