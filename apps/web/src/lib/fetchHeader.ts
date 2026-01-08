import type { HeaderData } from '../types/header'

// CMS_URL will be populated at build time from environment variables
// Astro's import.meta.env is typed in astro/client
const CMS_URL =
	(import.meta as any).env?.PUBLIC_CMS_URL || 'http://localhost:3000'

export async function fetchHeaderData(): Promise<HeaderData | null> {
	try {
		const response = await fetch(`${CMS_URL}/api/header`, {
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			console.error('Failed to fetch header data:', response.statusText)
			return null
		}

		const result = await response.json()

		if (!result.success || !result.data) {
			console.error('Invalid header data response')
			return null
		}

		return result.data
	} catch (error) {
		console.error('Error fetching header data:', error)
		return null
	}
}
