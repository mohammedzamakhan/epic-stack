import { getMenu } from 'emdash'
import { type FooterData } from '../types/footer'

export async function fetchFooterData(): Promise<FooterData | null> {
	try {
		const menu = await getMenu('footer')

		if (!menu) {
			console.error('Failed to fetch footer menu')
			return null
		}

		return { columns: menu.items } as FooterData
	} catch (error) {
		console.error('Error fetching footer data:', error)
		return null
	}
}
