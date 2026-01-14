/**
 * CMS API client for fetching content from Payload CMS
 * Combines the benefits of the official Astro guide patterns with proper TypeScript and error handling
 */

import { ENV } from 'varlock/env'

const CMS_URL = ENV.PUBLIC_CMS_URL

const CACHE_TTL_MS = import.meta.env.DEV ? 30 * 1000 : 5 * 60 * 1000

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

interface CacheEntry<T> {
	data: T
	expiresAt: number
}

class ResponseCache {
	private cache = new Map<string, CacheEntry<unknown>>()
	private ttlMs: number

	constructor(ttlMs: number) {
		this.ttlMs = ttlMs
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key)
		if (!entry) {
			return null
		}
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key)
			return null
		}
		return entry.data as T
	}

	set<T>(key: string, data: T): void {
		this.cache.set(key, {
			data,
			expiresAt: Date.now() + this.ttlMs,
		})
	}

	clear(): void {
		this.cache.clear()
	}
}

class CMSClient {
	private baseUrl: string
	private cache: ResponseCache

	constructor(baseUrl: string, cacheTtlMs: number = CACHE_TTL_MS) {
		this.baseUrl = baseUrl
		this.cache = new ResponseCache(cacheTtlMs)
	}

	private async fetch<T>(endpoint: string): Promise<T> {
		const url = `${this.baseUrl}/api${endpoint}`

		const cached = this.cache.get<T>(url)
		if (cached !== null) {
			return cached
		}

		const fetchOptions: RequestInit = {}
		if (import.meta.env.DEV && url.startsWith('https://')) {
			// @ts-ignore - Node.js specific option for self-signed certs
			fetchOptions.agent = new (await import('https')).Agent({
				rejectUnauthorized: false,
			})
		}

		const response = await fetch(url, fetchOptions)
		if (!response.ok) {
			throw new Error(`Failed to fetch from CMS: ${response.statusText}`)
		}

		const data: T = await response.json()
		this.cache.set(url, data)
		return data
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

	clearCache(): void {
		this.cache.clear()
	}
}

export const cmsClient = new CMSClient(CMS_URL)
