/**
 * CMS API client for fetching content from Payload CMS
 * Combines the benefits of the official Astro guide patterns with proper TypeScript and error handling
 */

const CMS_URL = (import.meta as any).env?.PUBLIC_CMS_URL

export interface Page {
	id: string
	title: string
	slug: string
	hero?: any
	layout?: any[]
	meta?: {
		title?: string
		description?: string
		image?: any
	}
	updatedAt: string
	createdAt: string
}

export interface Post {
	id: string
	title: string
	slug: string
	content?: any
	categories?: any[]
	heroImage?: any
	meta?: {
		title?: string
		description?: string
		image?: any
	}
	publishedAt?: string
	updatedAt: string
	createdAt: string
}

export interface PaginatedResponse<T> {
	docs: T[]
	totalDocs: number
	totalPages: number
	page: number
	limit: number
	hasNextPage: boolean
	hasPrevPage: boolean
}

class CMSClient {
	private baseUrl: string

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl
	}

	private async fetch<T>(endpoint: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}/api${endpoint}`)
		if (!response.ok) {
			throw new Error(`Failed to fetch from CMS: ${response.statusText}`)
		}
		return response.json()
	}

	async getPage(slug: string): Promise<Page | null> {
		try {
			const response = await this.fetch<PaginatedResponse<Page>>(
				`/pages?where[slug][equals]=${slug}&limit=1`,
			)
			return response.docs[0] || null
		} catch (error) {
			console.error('Error fetching page:', error)
			return null
		}
	}

	async getHomePage(): Promise<Page | null> {
		try {
			const response = await this.fetch<PaginatedResponse<Page>>(
				`/pages?where[slug][equals]=home&limit=1`,
			)
			return response.docs[0] || null
		} catch (error) {
			console.error('Error fetching home page:', error)
			return null
		}
	}

	async getPages(): Promise<Page[]> {
		try {
			const response =
				await this.fetch<PaginatedResponse<Page>>('/pages?limit=100')
			return response.docs
		} catch (error) {
			console.error('Error fetching pages:', error)
			return []
		}
	}

	async getPosts(page = 1, limit = 12): Promise<PaginatedResponse<Post>> {
		try {
			const response = await this.fetch<PaginatedResponse<Post>>(
				`/posts?page=${page}&limit=${limit}&sort=-publishedAt`,
			)
			return response
		} catch (error) {
			console.error('Error fetching posts:', error)
			return {
				docs: [],
				totalDocs: 0,
				totalPages: 0,
				page: 1,
				limit,
				hasNextPage: false,
				hasPrevPage: false,
			}
		}
	}

	async getPost(slug: string): Promise<Post | null> {
		try {
			const response = await this.fetch<PaginatedResponse<Post>>(
				`/posts?where[slug][equals]=${slug}&limit=1`,
			)
			return response.docs[0] || null
		} catch (error) {
			console.error('Error fetching post:', error)
			return null
		}
	}
}

export const cmsClient = new CMSClient(CMS_URL)
