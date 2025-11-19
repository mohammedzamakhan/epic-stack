/**
 * Structured Data (JSON-LD) Utilities
 *
 * Generate Schema.org structured data for better SEO and rich snippets.
 *
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
 */

export interface Organization {
	name: string
	url: string
	logo?: string
	description?: string
	email?: string
	telephone?: string
	address?: {
		streetAddress?: string
		addressLocality?: string
		addressRegion?: string
		postalCode?: string
		addressCountry?: string
	}
	sameAs?: string[] // Social media profiles
}

export interface Person {
	name: string
	url?: string
	image?: string
	jobTitle?: string
	email?: string
	sameAs?: string[] // Social media profiles
}

export interface WebSite {
	name: string
	url: string
	description?: string
	potentialAction?: {
		type: 'SearchAction'
		target: string // URL template with {search_term_string}
		queryInput: string // 'required name=search_term_string'
	}
}

export interface WebPage {
	name: string
	url: string
	description?: string
	breadcrumb?: BreadcrumbList
	image?: string | string[]
	author?: Person | Organization
	publisher?: Organization
	datePublished?: string
	dateModified?: string
}

export interface Article {
	headline: string
	description?: string
	image?: string | string[]
	author?: Person | Person[]
	publisher?: Organization
	datePublished: string
	dateModified?: string
	url?: string
	articleSection?: string
	keywords?: string[]
	wordCount?: number
}

export interface BlogPosting extends Article {
	blogName?: string
}

export interface BreadcrumbListItem {
	name: string
	item?: string
	position: number
}

export interface BreadcrumbList {
	itemListElement: BreadcrumbListItem[]
}

export interface FAQItem {
	question: string
	answer: string
}

export interface Product {
	name: string
	description?: string
	image?: string | string[]
	brand?: string | Organization
	sku?: string
	offers?: {
		price: string
		priceCurrency: string
		availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
		url?: string
		priceValidUntil?: string
	}
	aggregateRating?: {
		ratingValue: number
		reviewCount: number
		bestRating?: number
		worstRating?: number
	}
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema(org: Organization): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: org.name,
		url: org.url,
	}

	if (org.logo) schema.logo = org.logo
	if (org.description) schema.description = org.description
	if (org.email) schema.email = org.email
	if (org.telephone) schema.telephone = org.telephone
	if (org.sameAs) schema.sameAs = org.sameAs

	if (org.address) {
		schema.address = {
			'@type': 'PostalAddress',
			...org.address,
		}
	}

	return schema
}

/**
 * Generate WebSite structured data (for homepage)
 */
export function generateWebSiteSchema(site: WebSite): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: site.name,
		url: site.url,
	}

	if (site.description) schema.description = site.description

	if (site.potentialAction) {
		schema.potentialAction = {
			'@type': site.potentialAction.type,
			target: site.potentialAction.target,
			'query-input': site.potentialAction.queryInput,
		}
	}

	return schema
}

/**
 * Generate WebPage structured data
 */
export function generateWebPageSchema(page: WebPage): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: page.name,
		url: page.url,
	}

	if (page.description) schema.description = page.description
	if (page.image) schema.image = page.image
	if (page.author) schema.author = formatPersonOrOrg(page.author)
	if (page.publisher) schema.publisher = formatPersonOrOrg(page.publisher)
	if (page.datePublished) schema.datePublished = page.datePublished
	if (page.dateModified) schema.dateModified = page.dateModified
	if (page.breadcrumb) schema.breadcrumb = generateBreadcrumbSchema(page.breadcrumb)

	return schema
}

/**
 * Generate Article structured data
 */
export function generateArticleSchema(article: Article): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: article.headline,
		datePublished: article.datePublished,
	}

	if (article.description) schema.description = article.description
	if (article.image) schema.image = article.image
	if (article.url) schema.url = article.url
	if (article.dateModified) schema.dateModified = article.dateModified
	if (article.articleSection) schema.articleSection = article.articleSection
	if (article.keywords) schema.keywords = article.keywords.join(', ')
	if (article.wordCount) schema.wordCount = article.wordCount

	if (article.author) {
		schema.author = Array.isArray(article.author)
			? article.author.map(formatPersonOrOrg)
			: formatPersonOrOrg(article.author)
	}

	if (article.publisher) {
		schema.publisher = formatPersonOrOrg(article.publisher)
	}

	return schema
}

/**
 * Generate BlogPosting structured data
 */
export function generateBlogPostingSchema(post: BlogPosting): Record<string, any> {
	const schema = generateArticleSchema(post)
	schema['@type'] = 'BlogPosting'

	if (post.blogName) {
		schema.blogName = post.blogName
	}

	return schema
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(breadcrumb: BreadcrumbList): Record<string, any> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumb.itemListElement.map(item => ({
			'@type': 'ListItem',
			position: item.position,
			name: item.name,
			...(item.item && { item: item.item }),
		})),
	}
}

/**
 * Generate FAQPage structured data
 */
export function generateFAQPageSchema(faqs: FAQItem[]): Record<string, any> {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer,
			},
		})),
	}
}

/**
 * Generate Product structured data
 */
export function generateProductSchema(product: Product): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
	}

	if (product.description) schema.description = product.description
	if (product.image) schema.image = product.image
	if (product.sku) schema.sku = product.sku

	if (product.brand) {
		schema.brand = typeof product.brand === 'string'
			? { '@type': 'Brand', name: product.brand }
			: formatPersonOrOrg(product.brand)
	}

	if (product.offers) {
		schema.offers = {
			'@type': 'Offer',
			price: product.offers.price,
			priceCurrency: product.offers.priceCurrency,
			...(product.offers.availability && { availability: `https://schema.org/${product.offers.availability}` }),
			...(product.offers.url && { url: product.offers.url }),
			...(product.offers.priceValidUntil && { priceValidUntil: product.offers.priceValidUntil }),
		}
	}

	if (product.aggregateRating) {
		schema.aggregateRating = {
			'@type': 'AggregateRating',
			ratingValue: product.aggregateRating.ratingValue,
			reviewCount: product.aggregateRating.reviewCount,
			...(product.aggregateRating.bestRating && { bestRating: product.aggregateRating.bestRating }),
			...(product.aggregateRating.worstRating && { worstRating: product.aggregateRating.worstRating }),
		}
	}

	return schema
}

/**
 * Generate Person structured data
 */
export function generatePersonSchema(person: Person): Record<string, any> {
	const schema: Record<string, any> = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: person.name,
	}

	if (person.url) schema.url = person.url
	if (person.image) schema.image = person.image
	if (person.jobTitle) schema.jobTitle = person.jobTitle
	if (person.email) schema.email = person.email
	if (person.sameAs) schema.sameAs = person.sameAs

	return schema
}

/**
 * Helper to format Person or Organization for schema
 */
function formatPersonOrOrg(entity: Person | Organization): Record<string, any> {
	if ('jobTitle' in entity) {
		// It's a Person
		return {
			'@type': 'Person',
			name: entity.name,
			...(entity.url && { url: entity.url }),
			...(entity.image && { image: entity.image }),
		}
	} else {
		// It's an Organization
		return {
			'@type': 'Organization',
			name: entity.name,
			...(entity.url && { url: entity.url }),
			...(entity.logo && { logo: entity.logo }),
		}
	}
}

/**
 * Generate script tag for JSON-LD structured data
 * Use this in your route meta function
 */
export function structuredDataScriptTag(schema: Record<string, any>): { tagName: string; children: string; [key: string]: any } {
	return {
		tagName: 'script',
		type: 'application/ld+json',
		children: JSON.stringify(schema),
	}
}

/**
 * Combine multiple schemas into a single JSON-LD script
 */
export function combineStructuredData(schemas: Array<Record<string, any>>): { tagName: string; children: string; [key: string]: any } {
	return {
		tagName: 'script',
		type: 'application/ld+json',
		children: JSON.stringify(schemas.length === 1 ? schemas[0] : schemas),
	}
}
