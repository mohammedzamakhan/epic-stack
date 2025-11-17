import { i18n } from '@lingui/core'

export type CatalogLoader = (
	locale: string,
) => Promise<{ messages: Record<string, string> }>

/**
 * Creates a loadCatalog function with the provided catalog loader
 * @param catalogLoader - Function to dynamically import locale .po files
 * @returns Function to load and activate catalogs
 */
export function createCatalogLoader(catalogLoader: CatalogLoader) {
	return async function loadCatalog(locale: string) {
		const { messages } = await catalogLoader(locale)
		return i18n.loadAndActivate({ locale, messages })
	}
}

/**
 * Load and activate a catalog for the given locale
 * @param locale - The locale to load
 * @param messages - The messages for the locale
 */
export async function loadCatalog(
	locale: string,
	messages: Record<string, string>,
) {
	return i18n.loadAndActivate({ locale, messages })
}
