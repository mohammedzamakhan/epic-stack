/**
 * @repo/seo - Comprehensive SEO Utilities for Epic Stack
 *
 * This package provides SEO utilities for React Router applications including:
 * - Meta tag generation (Open Graph, Twitter Cards)
 * - Structured data (JSON-LD Schema.org)
 * - SEO helper functions
 *
 * @example Basic usage
 * ```typescript
 * import { generateSeoMeta } from '@repo/seo'
 *
 * export const meta: MetaFunction = ({ location }) => {
 *   return generateSeoMeta({
 *     title: 'My Page',
 *     description: 'Page description',
 *     url: `https://example.com${location.pathname}`,
 *   })
 * }
 * ```
 *
 * @example With structured data
 * ```typescript
 * import { generateSeoMeta, generateArticleSchema, structuredDataScriptTag } from '@repo/seo'
 *
 * export const meta: MetaFunction = ({ data, location }) => {
 *   const schema = generateArticleSchema({
 *     headline: data.post.title,
 *     description: data.post.excerpt,
 *     datePublished: data.post.publishedAt,
 *     author: { name: data.post.author.name },
 *   })
 *
 *   return [
 *     ...generateSeoMeta({
 *       title: data.post.title,
 *       description: data.post.excerpt,
 *       type: 'article',
 *     }),
 *     structuredDataScriptTag(schema),
 *   ]
 * }
 * ```
 */

// Meta tag utilities
export {
	generateSeoMeta,
	generateRobotsMeta,
	truncateDescription,
	generateTitle,
	extractDescription,
	type GenerateSeoMetaOptions,
	type SeoImage,
	type SeoArticle,
	type SeoTwitter,
	type SeoRobots,
} from './meta.js'

// Structured data utilities
export {
	generateOrganizationSchema,
	generateWebSiteSchema,
	generateWebPageSchema,
	generateArticleSchema,
	generateBlogPostingSchema,
	generateBreadcrumbSchema,
	generateFAQPageSchema,
	generateProductSchema,
	generatePersonSchema,
	structuredDataScriptTag,
	combineStructuredData,
	type Organization,
	type Person,
	type WebSite,
	type WebPage,
	type Article,
	type BlogPosting,
	type BreadcrumbList,
	type BreadcrumbListItem,
	type FAQItem,
	type Product,
} from './structured-data.js'

// SEO configuration utilities
export {
	SeoConfig,
	createSeoConfig,
	type SeoConfigOptions,
} from './config.js'

// Re-export from @nasa-gcn/remix-seo for convenience
export { type SEOHandle } from '@nasa-gcn/remix-seo'
