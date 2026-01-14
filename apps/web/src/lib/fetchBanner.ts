import type { BannerData } from '../types/banner'
import { ENV } from 'varlock/env'

const CMS_URL = ENV.PUBLIC_CMS_URL || 'http://localhost:3000'

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
