import { ENV } from 'varlock/env'

export type PublicOrganization = {
	name: string
	slug: string
}

function getAppUrl(): string {
	return (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '')
}

/**
 * Fetch a published organization by slug from the main app public API.
 */
export async function fetchPublishedOrganization(
	slug: string,
): Promise<PublicOrganization | null> {
	const url = `${getAppUrl()}/resources/sites/${encodeURIComponent(slug)}`

	try {
		const response = await fetch(url, {
			headers: {
				Accept: 'application/json',
			},
		})

		if (!response.ok) {
			return null
		}

		const data = (await response.json()) as PublicOrganization
		if (!data?.name || !data?.slug) {
			return null
		}

		return data
	} catch {
		return null
	}
}
