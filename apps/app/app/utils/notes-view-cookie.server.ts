import { createCookie } from 'react-router'

export const notesViewCookie = createCookie('notes-view', {
	maxAge: 31_536_000, // one year
	sameSite: 'lax',
	path: '/',
	httpOnly: true,
})

export async function getNotesViewMode(
	request: Request,
): Promise<'cards' | 'kanban'> {
	const cookieHeader = request.headers.get('Cookie')
	const cookie = (await notesViewCookie.parse(cookieHeader)) || {}
	return cookie.viewMode === 'kanban' ? 'kanban' : 'cards'
}

export async function setNotesViewMode(viewMode: 'cards' | 'kanban') {
	return await notesViewCookie.serialize({ viewMode })
}
