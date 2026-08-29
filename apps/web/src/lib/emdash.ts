/**
 * Emdash CMS content-fetching utilities
 * Replaces the Payload CMS REST API client
 */
import {
	getEmDashEntry,
	getEmDashCollection,
	getMenu,
	getSiteSettings,
	getTranslations,
	getSection,
	getSections,
	type Menu,
	type SiteSettings,
	type TranslationsResult,
} from 'emdash'

import {
	type Page,
	type Post,
	type PaginatedResponse,
} from './content-types.ts'

// Re-export for convenience
export {
	getEmDashEntry,
	getEmDashCollection,
	getMenu,
	getSiteSettings,
	getTranslations,
	getSection,
	getSections,
}
export type {
	TranslationsResult,
	Page,
	Post,
	PaginatedResponse,
	Menu,
	SiteSettings,
}

export type FooterMenuColumn = {
	heading: string
	menu: Menu
}

export type ResolvedSiteLogo = {
	mediaId: string
	alt?: string
	url: string
}

/** Resolve a site logo from Emdash site settings */
export function resolveSiteLogo(
	settings: Partial<SiteSettings> | null | undefined,
): ResolvedSiteLogo | null {
	const logo = settings?.logo
	if (!logo?.url) return null
	return {
		mediaId: logo.mediaId,
		alt: logo.alt,
		url: logo.url,
	}
}

/** Fetch a page by slug and optional locale */
export async function getPage(
	slug: string,
	locale?: string,
): Promise<Page | null> {
	try {
		const { entry } = await getEmDashEntry('pages', slug, { locale })
		return (entry?.data as unknown as Page) ?? null
	} catch (error) {
		console.error('Error fetching page:', error)
		return null
	}
}

/** Fetch the home page for a specific locale */
export async function getHomePage(locale?: string): Promise<Page | null> {
	return getPage('home', locale)
}

/** Fetch all pages for a specific locale */
export async function getPages(locale?: string): Promise<Page[]> {
	try {
		const { entries } = await getEmDashCollection('pages', { locale })
		return entries.map((e: any) => e.data as Page)
	} catch (error) {
		console.error('Error fetching pages:', error)
		return []
	}
}

/** Fetch posts with pagination and optional locale */
export async function getPosts(
	page = 1,
	limit = 12,
	locale?: string,
): Promise<PaginatedResponse<Post>> {
	try {
		const query: any = {
			limit,
			offset: (page - 1) * limit,
		}
		// Only add locale if provided to prevent strict filtering out of non-localized seeded posts
		if (locale) {
			query.locale = locale
		}

		const { entries } = await getEmDashCollection('posts', query)
		const total = entries.length // Note: Emdash may provide total count differently
		return {
			entries: entries.map((e: any) => e.data as Post),
			total,
			page,
			limit,
			hasNextPage: entries.length === limit,
			hasPrevPage: page > 1,
			totalPages: Math.ceil(total / limit),
		}
	} catch (error) {
		console.error('ERROR IN GETPOSTS:', error)
		return {
			entries: [],
			total: 0,
			page: 1,
			limit,
			hasNextPage: false,
			hasPrevPage: false,
			totalPages: 0,
		}
	}
}

/** Fetch a single post by slug and optional locale */
export async function getPost(
	slug: string,
	locale?: string,
): Promise<Post | null> {
	try {
		const { entry } = await getEmDashEntry('posts', slug, { locale })
		return (entry?.data as unknown as Post) ?? null
	} catch (error) {
		console.error('Error fetching post:', error)
		return null
	}
}

/** Fetch the primary header menu for a specific locale */
export async function getPrimaryMenu(locale?: string): Promise<Menu | null> {
	try {
		return await getMenu('primary', locale ? { locale } : {})
	} catch (error) {
		console.error('Error fetching primary menu:', error)
		return null
	}
}

/** Fetch footer menu columns for a specific locale */
export async function getFooterMenuColumns(
	locale?: string,
): Promise<FooterMenuColumn[]> {
	const menuOptions = locale ? { locale } : {}
	const columns: Array<{ heading: string; name: string }> = [
		{ heading: 'Product', name: 'footer_product' },
		{ heading: 'Resources', name: 'footer_resources' },
		{ heading: 'Company', name: 'footer_company' },
		{ heading: 'Legal', name: 'footer_legal' },
	]

	try {
		const menus = await Promise.all(
			columns.map(async ({ heading, name }) => ({
				heading,
				menu: await getMenu(name, menuOptions),
			})),
		)

		return menus.filter((column): column is FooterMenuColumn =>
			Boolean(column.menu && column.menu.items.length > 0),
		)
	} catch (error) {
		console.error('Error fetching footer menus:', error)
		return []
	}
}

/** Fetch announcement banner from Emdash site settings for a specific locale */
export async function getBanner(locale?: string) {
	try {
		const { entry } = await getEmDashEntry('settings', 'banner', { locale })
		return entry?.data ?? null
	} catch (error) {
		console.error('Error fetching banner:', error)
		return null
	}
}

/** Fetch a reusable section by slug (e.g., 'hero-centered', 'pricing-table') */
export async function getPageSection(slug: string) {
	try {
		const section = await getSection(slug)
		return section ?? null
	} catch (error) {
		console.error('Error fetching section:', error)
		return null
	}
}

/** Fetch all available sections */
export async function getAllSections() {
	try {
		const { items } = await getSections()
		return items
	} catch (error) {
		console.error('Error fetching sections:', error)
		return []
	}
}
