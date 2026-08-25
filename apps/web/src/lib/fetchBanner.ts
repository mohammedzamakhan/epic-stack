import { getSiteSettings } from 'emdash'
import { type BannerData } from '../types/banner'

export async function fetchBannerData(): Promise<BannerData | null> {
	try {
		const settings = await getSiteSettings()

		if (!settings) {
			console.error('Failed to fetch site settings for banner')
			return null
		}

		// Assume banner settings might be in site settings under some key, or create a sensible default
		return { text: (settings as any).bannerText, link: (settings as any).bannerLink } as BannerData
	} catch (error) {
		console.error('Error fetching banner data:', error)
		return null
	}
}
