/**
 * Emdash CMS content-fetching utilities
 * Replaces the Payload CMS REST API client
 */
import {
	getEmDashEntry,
	getEmDashCollection,
	getTranslations,
	getSection,
	getSections,
	type TranslationsResult,
} from 'emdash'

// Re-export for convenience
export {
	getEmDashEntry,
	getEmDashCollection,
	getTranslations,
	getSection,
	getSections,
}
export type { TranslationsResult }

export interface Page {
	id: string
	slug: string
	title: string
	content?: any
	hero?: {
		type?: string
		title?: string
		description?: string
		media?: {
			url: string
			alt?: string
		}
		links?: Array<{
			label: string
			url: string
			type?: string
		}>
	}
	layout?: any[]
	seo?: {
		title?: string
		description?: string
		image?: {
			url: string
			alt?: string
		}
	}
	updatedAt?: string
	createdAt?: string
}

export interface Post {
	id: string
	slug: string
	title: string
	content?: any
	categories?: Array<{ name: string; slug: string }>
	heroImage?: {
		url: string
		alt?: string
	}
	seo?: {
		title?: string
		description?: string
		image?: {
			url: string
			alt?: string
		}
	}
	publishedAt?: string
	updatedAt?: string
	createdAt?: string
}

export interface PaginatedResponse<T> {
	entries: T[]
	total: number
	page: number
	limit: number
	hasNextPage: boolean
	hasPrevPage: boolean
	totalPages: number
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

/** Fetch header navigation from Emdash menus for a specific locale */
export async function getHeader(locale?: string) {
	try {
		const { entry } = await getEmDashEntry('menus', 'header', { locale })
		return entry?.data ?? null
	} catch (error) {
		console.error('Error fetching header:', error)
		return null
	}
}

/** Fetch footer data from Emdash menus for a specific locale */
export async function getFooter(locale?: string) {
	try {
		const { entry } = await getEmDashEntry('menus', 'footer', { locale })
		return entry?.data ?? null
	} catch (error) {
		console.error('Error fetching footer:', error)
		return null
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
