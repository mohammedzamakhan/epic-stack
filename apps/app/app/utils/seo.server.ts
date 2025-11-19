/**
 * SEO Configuration for Epic Stack App
 *
 * This file provides centralized SEO configuration using the @repo/seo package.
 * It integrates with the brand configuration to provide consistent SEO across the app.
 */

import { brand } from '@repo/config/brand'
import { createSeoConfig } from '@repo/seo'

/**
 * Default Open Graph image URL
 * Update this to point to your actual OG image
 */
const DEFAULT_OG_IMAGE = '/images/og-image.jpg'

/**
 * SEO configuration for the main app
 */
export const seoConfig = createSeoConfig({
	siteName: brand.name,
	description: brand.products.app.description,
	siteUrl: process.env.APP_URL || brand.url,
	defaultImage: {
		url: `${process.env.APP_URL || brand.url}${DEFAULT_OG_IMAGE}`,
		alt: `${brand.name} - ${brand.tagline}`,
		width: 1200,
		height: 630,
	},
	twitterHandle: brand.twitter,
	locale: 'en_US',
	keywords: [
		'saas',
		'full-stack',
		'react',
		'typescript',
		'remix',
		'react router',
		'prisma',
	],
	author: brand.companyName,
})

/**
 * Get default SEO meta for routes that don't specify custom SEO
 */
export function getDefaultSeoMeta() {
	return seoConfig.getDefaults()
}

/**
 * Generate SEO meta for a standard page
 */
export function getPageSeoMeta(
	title: string,
	description: string,
	options?: {
		url?: string
		image?: { url: string; alt: string; width?: number; height?: number }
		keywords?: string[]
	},
) {
	return seoConfig.getPageMeta(title, description, options)
}

/**
 * Generate SEO meta for an article/blog post
 */
export function getArticleSeoMeta(
	title: string,
	description: string,
	options?: {
		url?: string
		image?: { url: string; alt: string; width?: number; height?: number }
		publishedTime?: string
		modifiedTime?: string
		author?: string
		section?: string
		tags?: string[]
	},
) {
	return seoConfig.getArticleMeta(title, description, options)
}
