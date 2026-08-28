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
