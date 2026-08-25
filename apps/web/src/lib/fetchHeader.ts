import { getMenu } from 'emdash'
import { type HeaderData } from '../types/header'

export async function fetchHeaderData(): Promise<HeaderData | null> {
	try {
		const menu = await getMenu('header')

		if (!menu) {
			console.error('Failed to fetch header menu')
			return null
		}

		return { navItems: menu.items } as HeaderData
	} catch (error) {
		console.error('Error fetching header data:', error)
		return null
	}
}
