import type { HeaderData } from '../types/header'
import { ENV } from 'varlock/env'

const CMS_URL = ENV.PUBLIC_CMS_URL || 'http://localhost:3000'

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
