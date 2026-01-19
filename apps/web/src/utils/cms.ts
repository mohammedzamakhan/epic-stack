import { ENV } from '../env'

/**
 * Generates a full URL for a CMS image
 * Handles checking if URL is already absolute and managing slash merging
 */
export function getCmsImageUrl(url: string | undefined | null): string {
	if (!url) return ''

	// If it's already an absolute URL (starts with http/https), return as is
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url
	}

	const cmsUrl = ENV.PUBLIC_CMS_URL
	// Ensure no double slashes when joining
	const baseUrl = cmsUrl.endsWith('/') ? cmsUrl.slice(0, -1) : cmsUrl
	const imagePath = url.startsWith('/') ? url : `/${url}`

	return `${baseUrl}${imagePath}`
}
