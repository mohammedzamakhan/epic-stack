/**
 * SEO Meta Tag Utilities for React Router Apps
 *
 * This module provides comprehensive SEO meta tag generation including:
 * - Basic meta tags (title, description, keywords)
 * - Open Graph tags (Facebook, LinkedIn)
 * - Twitter Card tags
 * - Canonical URLs
 * - Robots directives
 *
 * @example
 * ```typescript
 * export const meta: MetaFunction = ({ data, location }) => {
 *   return generateSeoMeta({
 *     title: 'My Page Title',
 *     description: 'My page description',
 *     url: `https://example.com${location.pathname}`,
 *     image: {
 *       url: 'https://example.com/og-image.jpg',
 *       alt: 'My page image',
 *     },
 *   })
 * }
 * ```
 */

export interface SeoImage {
	url: string
	alt?: string
	width?: number
	height?: number
	type?: string
}

export interface SeoArticle {
	publishedTime?: string
	modifiedTime?: string
	author?: string
	section?: string
	tags?: string[]
}

export interface SeoTwitter {
	card?: 'summary' | 'summary_large_image' | 'app' | 'player'
	site?: string
	creator?: string
}

export interface SeoRobots {
	index?: boolean
	follow?: boolean
	noarchive?: boolean
	nosnippet?: boolean
	maxImagePreview?: 'none' | 'standard' | 'large'
	maxSnippet?: number
	maxVideoPreview?: number
}

export interface GenerateSeoMetaOptions {
	/** Page title (will be used for og:title and twitter:title) */
	title: string
	/** Page description (will be used for og:description and twitter:description) */
	description: string
	/** Canonical URL for the page */
	url?: string
	/** Open Graph image */
	image?: SeoImage
	/** Open Graph type (default: 'website') */
	type?: 'website' | 'article' | 'profile' | 'book' | 'video.movie' | 'video.episode' | 'music.song' | 'music.album'
	/** Site name for Open Graph */
	siteName?: string
	/** Locale (default: 'en_US') */
	locale?: string
	/** Article metadata (only for type='article') */
	article?: SeoArticle
	/** Twitter-specific settings */
	twitter?: SeoTwitter
	/** Keywords for meta keywords tag */
	keywords?: string[]
	/** Author name */
	author?: string
	/** Robots directives */
	robots?: SeoRobots
	/** Additional meta tags */
	additionalMeta?: Array<{ name?: string; property?: string; content: string }>
	/** Additional link tags */
	additionalLinks?: Array<{ rel: string; href: string; [key: string]: string }>
}

/**
 * Generate comprehensive SEO meta tags for React Router routes
 */
export function generateSeoMeta(options: GenerateSeoMetaOptions): Array<{ tagName?: string; name?: string; property?: string; content?: string; rel?: string; href?: string; [key: string]: any }> {
	const {
		title,
		description,
		url,
		image,
		type = 'website',
		siteName,
		locale = 'en_US',
		article,
		twitter,
		keywords,
		author,
		robots,
		additionalMeta = [],
		additionalLinks = [],
	} = options

	const meta: Array<any> = []

	// Basic meta tags
	meta.push({ title })
	meta.push({ name: 'description', content: description })

	if (keywords && keywords.length > 0) {
		meta.push({ name: 'keywords', content: keywords.join(', ') })
	}

	if (author) {
		meta.push({ name: 'author', content: author })
	}

	// Robots meta tag
	if (robots) {
		const robotsContent: string[] = []

		if (robots.index === false) robotsContent.push('noindex')
		else if (robots.index === true) robotsContent.push('index')

		if (robots.follow === false) robotsContent.push('nofollow')
		else if (robots.follow === true) robotsContent.push('follow')

		if (robots.noarchive) robotsContent.push('noarchive')
		if (robots.nosnippet) robotsContent.push('nosnippet')
		if (robots.maxImagePreview) robotsContent.push(`max-image-preview:${robots.maxImagePreview}`)
		if (robots.maxSnippet) robotsContent.push(`max-snippet:${robots.maxSnippet}`)
		if (robots.maxVideoPreview) robotsContent.push(`max-video-preview:${robots.maxVideoPreview}`)

		if (robotsContent.length > 0) {
			meta.push({ name: 'robots', content: robotsContent.join(', ') })
		}
	}

	// Canonical URL
	if (url) {
		meta.push({ tagName: 'link', rel: 'canonical', href: url })
	}

	// Open Graph tags
	meta.push({ property: 'og:type', content: type })
	meta.push({ property: 'og:title', content: title })
	meta.push({ property: 'og:description', content: description })

	if (url) {
		meta.push({ property: 'og:url', content: url })
	}

	if (siteName) {
		meta.push({ property: 'og:site_name', content: siteName })
	}

	meta.push({ property: 'og:locale', content: locale })

	if (image) {
		meta.push({ property: 'og:image', content: image.url })
		meta.push({ property: 'og:image:secure_url', content: image.url })

		if (image.alt) {
			meta.push({ property: 'og:image:alt', content: image.alt })
		}
		if (image.width) {
			meta.push({ property: 'og:image:width', content: String(image.width) })
		}
		if (image.height) {
			meta.push({ property: 'og:image:height', content: String(image.height) })
		}
		if (image.type) {
			meta.push({ property: 'og:image:type', content: image.type })
		}
	}

	// Article-specific Open Graph tags
	if (type === 'article' && article) {
		if (article.publishedTime) {
			meta.push({ property: 'article:published_time', content: article.publishedTime })
		}
		if (article.modifiedTime) {
			meta.push({ property: 'article:modified_time', content: article.modifiedTime })
		}
		if (article.author) {
			meta.push({ property: 'article:author', content: article.author })
		}
		if (article.section) {
			meta.push({ property: 'article:section', content: article.section })
		}
		if (article.tags) {
			article.tags.forEach(tag => {
				meta.push({ property: 'article:tag', content: tag })
			})
		}
	}

	// Twitter Card tags
	const twitterCard = twitter?.card || (image ? 'summary_large_image' : 'summary')
	meta.push({ name: 'twitter:card', content: twitterCard })
	meta.push({ name: 'twitter:title', content: title })
	meta.push({ name: 'twitter:description', content: description })

	if (twitter?.site) {
		meta.push({ name: 'twitter:site', content: twitter.site })
	}
	if (twitter?.creator) {
		meta.push({ name: 'twitter:creator', content: twitter.creator })
	}

	if (image) {
		meta.push({ name: 'twitter:image', content: image.url })
		if (image.alt) {
			meta.push({ name: 'twitter:image:alt', content: image.alt })
		}
	}

	// Additional meta tags
	meta.push(...additionalMeta)

	// Additional link tags
	meta.push(...additionalLinks)

	return meta
}

/**
 * Generate robots meta tag
 */
export function generateRobotsMeta(directives: SeoRobots): { name: string; content: string } {
	const content: string[] = []

	if (directives.index === false) content.push('noindex')
	else if (directives.index === true) content.push('index')

	if (directives.follow === false) content.push('nofollow')
	else if (directives.follow === true) content.push('follow')

	if (directives.noarchive) content.push('noarchive')
	if (directives.nosnippet) content.push('nosnippet')
	if (directives.maxImagePreview) content.push(`max-image-preview:${directives.maxImagePreview}`)
	if (directives.maxSnippet) content.push(`max-snippet:${directives.maxSnippet}`)
	if (directives.maxVideoPreview) content.push(`max-video-preview:${directives.maxVideoPreview}`)

	return { name: 'robots', content: content.join(', ') }
}

/**
 * Truncate description to optimal length (155-160 characters for SEO)
 */
export function truncateDescription(text: string, maxLength: number = 160): string {
	if (text.length <= maxLength) return text

	// Find the last space before maxLength
	const truncated = text.slice(0, maxLength)
	const lastSpace = truncated.lastIndexOf(' ')

	if (lastSpace > maxLength - 20) {
		return truncated.slice(0, lastSpace) + '...'
	}

	return truncated.slice(0, maxLength - 3) + '...'
}

/**
 * Generate title with site name
 */
export function generateTitle(pageTitle: string, siteName?: string, separator: string = '|'): string {
	if (!siteName) return pageTitle
	return `${pageTitle} ${separator} ${siteName}`
}

/**
 * Extract first 160 characters from HTML/Markdown content for meta description
 */
export function extractDescription(content: string, maxLength: number = 160): string {
	// Remove HTML tags
	const textOnly = content.replace(/<[^>]*>/g, ' ')
	// Remove markdown syntax
	const cleanText = textOnly
		.replace(/#+\s/g, '') // Remove headers
		.replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
		.replace(/\*([^*]+)\*/g, '$1') // Remove italic
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()

	return truncateDescription(cleanText, maxLength)
}
