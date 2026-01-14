import { type FooterData } from '../types/footer'
import { ENV } from 'varlock/env'

const CMS_URL = ENV.PUBLIC_CMS_URL || 'http://localhost:3000'

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
