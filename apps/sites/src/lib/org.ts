import { ENV } from 'varlock/env'

export type PublicOrganization = {
	name: string
	slug: string
	customDomain?: string | null
}

function getAppUrl(): string {
	return (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(/\/$/, '')
}

async function fetchPublicOrganization(
	params: URLSearchParams,
): Promise<PublicOrganization | null> {
	const url = `${getAppUrl()}/resources/sites?${params.toString()}`

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

/**
 * Fetch a published organization by slug from the main app public API.
 */
export async function fetchPublishedOrganization(
	slug: string,
): Promise<PublicOrganization | null> {
	return fetchPublicOrganization(new URLSearchParams({ slug }))
}

/**
 * Fetch a published organization by custom domain host.
 */
export async function fetchPublishedOrganizationByHost(
	host: string,
): Promise<PublicOrganization | null> {
	return fetchPublicOrganization(new URLSearchParams({ host }))
}
