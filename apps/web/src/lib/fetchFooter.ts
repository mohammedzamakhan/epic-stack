import { type FooterData } from '../types/footer'

// CMS_URL will be populated at build time from environment variables
// Astro's import.meta.env is typed in astro/client
const CMS_URL =
	(import.meta as any).env?.PUBLIC_CMS_URL || 'http://localhost:3000'

export async function fetchFooterData(): Promise<FooterData | null> {
	try {
		const response = await fetch(`${CMS_URL}/api/footer`, {
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			console.error('Failed to fetch footer data:', response.statusText)
			return null
		}

		const result = await response.json()

		if (!result.success || !result.data) {
			console.error('Invalid footer data response')
			return null
		}

		return result.data
	} catch (error) {
		console.error('Error fetching footer data:', error)
		return null
	}
}
