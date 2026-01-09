import type { BannerData } from '../types/banner'

// CMS_URL will be populated at build time from environment variables
// Astro's import.meta.env is typed in astro/client
const CMS_URL =
	(import.meta as any).env?.PUBLIC_CMS_URL || 'http://localhost:3000'

export async function fetchBannerData(): Promise<BannerData | null> {
	try {
		const response = await fetch(`${CMS_URL}/api/banner`, {
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			console.error('Failed to fetch banner data:', response.statusText)
			return null
		}

		const result = await response.json()

		if (!result.success || !result.data) {
			console.error('Invalid banner data response')
			return null
		}

		return result.data
	} catch (error) {
		console.error('Error fetching banner data:', error)
		return null
	}
}
