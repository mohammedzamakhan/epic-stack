/**
 * SEO Configuration
 *
 * Centralized configuration for SEO defaults across apps.
 * Import and customize in your app's root or individual routes.
 */

import type { GenerateSeoMetaOptions } from './meta.js'

export interface SeoConfigOptions {
	/** Site name */
	siteName: string
	/** Site tagline/description */
	description: string
	/** Site URL (without trailing slash) */
	siteUrl: string
	/** Default Open Graph image */
	defaultImage?: {
		url: string
		alt: string
		width?: number
		height?: number
	}
	/** Twitter handle (with @) */
	twitterHandle?: string
	/** Default locale */
	locale?: string
	/** Default keywords */
	keywords?: string[]
	/** Author/company name */
	author?: string
}

export class SeoConfig {
	private config: SeoConfigOptions

	constructor(config: SeoConfigOptions) {
		this.config = config
	}

	/**
	 * Get default SEO meta options
	 * Override with page-specific values in route meta functions
	 */
	getDefaults(overrides?: Partial<GenerateSeoMetaOptions>): GenerateSeoMetaOptions {
		return {
			title: this.config.siteName,
			description: this.config.description,
			url: this.config.siteUrl,
			siteName: this.config.siteName,
			locale: this.config.locale || 'en_US',
			keywords: this.config.keywords,
			author: this.config.author,
			image: this.config.defaultImage,
			twitter: {
				card: 'summary_large_image',
				site: this.config.twitterHandle,
			},
			...overrides,
		}
	}

	/**
	 * Generate SEO meta for homepage
	 */
	getHomepageMeta(overrides?: Partial<GenerateSeoMetaOptions>): GenerateSeoMetaOptions {
		return this.getDefaults({
			type: 'website',
			...overrides,
		})
	}

	/**
	 * Generate SEO meta for article/blog posts
	 */
	getArticleMeta(
		title: string,
		description: string,
		options?: {
			url?: string
			image?: GenerateSeoMetaOptions['image']
			publishedTime?: string
			modifiedTime?: string
			author?: string
			section?: string
			tags?: string[]
		},
	): GenerateSeoMetaOptions {
		return this.getDefaults({
			title: `${title} | ${this.config.siteName}`,
			description,
			type: 'article',
			url: options?.url,
			image: options?.image || this.config.defaultImage,
			article: {
				publishedTime: options?.publishedTime,
				modifiedTime: options?.modifiedTime,
				author: options?.author,
				section: options?.section,
				tags: options?.tags,
			},
		})
	}

	/**
	 * Generate SEO meta for standard pages
	 */
	getPageMeta(
		title: string,
		description: string,
		options?: {
			url?: string
			image?: GenerateSeoMetaOptions['image']
			keywords?: string[]
		},
	): GenerateSeoMetaOptions {
		return this.getDefaults({
			title: `${title} | ${this.config.siteName}`,
			description,
			type: 'website',
			url: options?.url,
			image: options?.image || this.config.defaultImage,
			keywords: options?.keywords || this.config.keywords,
		})
	}

	/**
	 * Get site name
	 */
	getSiteName(): string {
		return this.config.siteName
	}

	/**
	 * Get site URL
	 */
	getSiteUrl(): string {
		return this.config.siteUrl
	}

	/**
	 * Get Twitter handle
	 */
	getTwitterHandle(): string | undefined {
		return this.config.twitterHandle
	}
}

/**
 * Create a SEO configuration instance
 */
export function createSeoConfig(config: SeoConfigOptions): SeoConfig {
	return new SeoConfig(config)
}
