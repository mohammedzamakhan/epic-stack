# Comprehensive SEO Guide for Epic Stack

This guide covers the complete SEO implementation in Epic Stack, including the
new `@repo/seo` package that provides comprehensive SEO utilities for React
Router applications.

## Table of Contents

1. [Overview](#overview)
2. [SEO Package (@repo/seo)](#seo-package-reposeo)
3. [Quick Start](#quick-start)
4. [Meta Tags](#meta-tags)
5. [Open Graph Tags](#open-graph-tags)
6. [Twitter Cards](#twitter-cards)
7. [Structured Data (JSON-LD)](#structured-data-json-ld)
8. [Sitemaps and Robots.txt](#sitemaps-and-robotstxt)
9. [Route-Specific SEO](#route-specific-seo)
10. [Best Practices](#best-practices)
11. [Testing and Validation](#testing-and-validation)
12. [Troubleshooting](#troubleshooting)

## Overview

Epic Stack now includes comprehensive SEO support across all applications:

- **Main App (React Router)**: Full SEO with Open Graph, Twitter Cards, and
  structured data
- **Marketing Site (Astro)**: Complete SEO implementation with comprehensive
  meta tags
- **Admin App**: Protected routes with appropriate robots directives
- **CMS**: SEO plugin integration with Payload CMS

### Key Features

✅ **Meta Tags**: Comprehensive title, description, and keyword management ✅
**Open Graph**: Full Facebook/LinkedIn sharing optimization ✅ **Twitter
Cards**: Rich Twitter previews with images ✅ **Structured Data**: JSON-LD
schemas for better search engine understanding ✅ **Sitemaps**: Dynamic sitemap
generation for all apps ✅ **Robots Control**: Fine-grained indexing control ✅
**Canonical URLs**: Proper URL management to avoid duplicate content ✅ **Image
Optimization**: Automatic image optimization with OpenImg

## SEO Package (@repo/seo)

The `@repo/seo` package provides reusable SEO utilities for all React Router
apps in the monorepo.

### Installation

The package is already configured for use in the monorepo. To use it in an app:

```typescript
import {
	generateSeoMeta,
	generateArticleSchema,
	structuredDataScriptTag,
} from '@repo/seo'
```

### Core Functions

#### `generateSeoMeta(options)`

Generate comprehensive SEO meta tags including Open Graph and Twitter Cards.

```typescript
export const meta: MetaFunction = ({ location }) => {
	return generateSeoMeta({
		title: 'My Page Title',
		description: 'A compelling description of my page',
		url: `https://example.com${location.pathname}`,
		image: {
			url: 'https://example.com/og-image.jpg',
			alt: 'Image description',
			width: 1200,
			height: 630,
		},
		siteName: 'Epic Stack',
		twitter: {
			card: 'summary_large_image',
			site: '@epicstartup',
		},
	})
}
```

#### Structured Data Functions

- `generateOrganizationSchema()` - Company/organization info
- `generateWebSiteSchema()` - Homepage schema with search action
- `generateArticleSchema()` - Blog posts and articles
- `generateBreadcrumbSchema()` - Navigation breadcrumbs
- `generateFAQPageSchema()` - FAQ pages
- `generateProductSchema()` - Products and pricing

## Quick Start

### 1. Basic Page SEO

For a standard page with basic SEO:

```typescript
// routes/about.tsx
import { type MetaFunction } from 'react-router'
import { generateSeoMeta } from '@repo/seo'

export const meta: MetaFunction = ({ location }) => {
  return generateSeoMeta({
    title: 'About Us | Epic Stack',
    description: 'Learn about Epic Stack and our mission to help developers build amazing SaaS applications.',
    url: `https://epicstartup.com${location.pathname}`,
  })
}

export default function About() {
  return <div>About page content</div>
}
```

### 2. Article/Blog Post SEO

For blog posts with rich metadata:

```typescript
// routes/blog/$slug.tsx
import { type MetaFunction } from 'react-router'
import {
	generateSeoMeta,
	generateArticleSchema,
	structuredDataScriptTag,
} from '@repo/seo'

export const meta: MetaFunction = ({ data, location }) => {
	const article = data.article

	const schema = generateArticleSchema({
		headline: article.title,
		description: article.excerpt,
		image: article.coverImage,
		datePublished: article.publishedAt,
		dateModified: article.updatedAt,
		author: {
			name: article.author.name,
			url: `https://epicstartup.com/authors/${article.author.slug}`,
		},
		publisher: {
			name: 'Epic Stack',
			url: 'https://epicstartup.com',
			logo: 'https://epicstartup.com/logo.png',
		},
	})

	return [
		...generateSeoMeta({
			title: article.title,
			description: article.excerpt,
			url: `https://epicstartup.com${location.pathname}`,
			type: 'article',
			image: {
				url: article.coverImage,
				alt: article.title,
			},
			article: {
				publishedTime: article.publishedAt,
				modifiedTime: article.updatedAt,
				author: article.author.name,
				tags: article.tags,
			},
		}),
		structuredDataScriptTag(schema),
	]
}
```

### 3. Protected Route SEO

For authenticated pages that shouldn't be indexed:

```typescript
// routes/profile.tsx
import { type MetaFunction } from 'react-router'
import { generateSeoMeta } from '@repo/seo'

export const meta: MetaFunction = () => {
	return generateSeoMeta({
		title: 'Profile Settings | Epic Stack',
		description: 'Manage your account settings',
		robots: {
			index: false,
			follow: false,
		},
	})
}
```

## Meta Tags

### Title Optimization

**Best Practices:**

- Keep titles between 50-60 characters
- Include primary keyword near the beginning
- Use separator (| or -) with brand name
- Make unique for each page

```typescript
// ✅ Good
title: 'SEO Best Practices | Epic Stack'

// ❌ Too long
title: 'Complete Guide to Search Engine Optimization Best Practices for Modern Web Applications | Epic Stack'

// ❌ Not descriptive
title: 'Page'
```

### Description Optimization

**Best Practices:**

- Keep between 155-160 characters
- Include call-to-action
- Use active voice
- Include target keywords naturally

```typescript
description: 'Learn how to build production-ready SaaS applications with Epic Stack. Get started with our comprehensive guides and templates today.'
```

### Keywords

While meta keywords are largely ignored by search engines, they can still be
useful for internal search:

```typescript
keywords: ['saas', 'react', 'typescript', 'full-stack', 'boilerplate']
```

## Open Graph Tags

Open Graph tags control how your pages appear when shared on Facebook, LinkedIn,
and other social platforms.

### Required Tags

```typescript
generateSeoMeta({
	title: 'My Page Title',
	description: 'My page description',
	url: 'https://example.com/my-page',
	image: {
		url: 'https://example.com/og-image.jpg',
		alt: 'Image description',
		width: 1200,
		height: 630,
	},
	type: 'website', // or 'article', 'profile', etc.
	siteName: 'Epic Stack',
})
```

### Image Requirements

**Optimal Open Graph Image Specifications:**

- **Dimensions**: 1200x630 pixels (recommended)
- **Aspect Ratio**: 1.91:1
- **Min Size**: 200x200 pixels
- **Max File Size**: 8 MB
- **Format**: JPG, PNG, WebP, or GIF

### Article-Specific Tags

For blog posts and articles:

```typescript
article: {
  publishedTime: '2024-01-01T00:00:00Z',
  modifiedTime: '2024-01-15T00:00:00Z',
  author: 'John Doe',
  section: 'Technology',
  tags: ['react', 'typescript', 'seo'],
}
```

## Twitter Cards

Twitter Cards provide rich previews when your links are shared on Twitter/X.

### Card Types

1. **Summary Card**: Small square image
2. **Summary Large Image**: Large rectangular image (most common)
3. **App Card**: Mobile app promotion
4. **Player Card**: Video/audio content

### Configuration

```typescript
twitter: {
  card: 'summary_large_image',
  site: '@epicstartup',    // Your site's Twitter handle
  creator: '@author',      // Content creator's Twitter handle
}
```

## Structured Data (JSON-LD)

Structured data helps search engines understand your content and can enable rich
snippets in search results.

### Organization Schema

Add to your homepage or root layout:

```typescript
import { generateOrganizationSchema, structuredDataScriptTag } from '@repo/seo'

const schema = generateOrganizationSchema({
	name: 'Epic Stack',
	url: 'https://epicstartup.com',
	logo: 'https://epicstartup.com/logo.png',
	description: 'Modern SaaS boilerplate',
	email: 'support@epicstartup.com',
	sameAs: [
		'https://twitter.com/epicstartup',
		'https://github.com/mohammedzamakhan/epic-startup',
	],
})

// In meta function
return [...otherMeta, structuredDataScriptTag(schema)]
```

### WebSite Schema with Search

For homepage with site-wide search:

```typescript
const schema = generateWebSiteSchema({
	name: 'Epic Stack',
	url: 'https://epicstartup.com',
	description: 'Modern SaaS boilerplate',
	potentialAction: {
		type: 'SearchAction',
		target: 'https://epicstartup.com/search?q={search_term_string}',
		queryInput: 'required name=search_term_string',
	},
})
```

### Article Schema

For blog posts:

```typescript
const schema = generateArticleSchema({
	headline: 'My Article Title',
	description: 'Article description',
	image: 'https://example.com/article-image.jpg',
	datePublished: '2024-01-01T00:00:00Z',
	dateModified: '2024-01-15T00:00:00Z',
	author: {
		name: 'John Doe',
		url: 'https://example.com/authors/john',
	},
	publisher: {
		name: 'Epic Stack',
		url: 'https://example.com',
		logo: 'https://example.com/logo.png',
	},
})
```

### Breadcrumb Schema

For navigation breadcrumbs:

```typescript
const schema = generateBreadcrumbSchema({
	itemListElement: [
		{ name: 'Home', item: 'https://example.com', position: 1 },
		{ name: 'Blog', item: 'https://example.com/blog', position: 2 },
		{ name: 'Article Title', position: 3 },
	],
})
```

### FAQ Schema

For FAQ pages:

```typescript
const schema = generateFAQPageSchema([
	{
		question: 'What is Epic Stack?',
		answer: 'Epic Stack is a production-ready full-stack SaaS template...',
	},
	{
		question: 'How do I get started?',
		answer: 'Clone the repository and run npm install...',
	},
])
```

## Sitemaps and Robots.txt

### Dynamic Sitemaps

Epic Stack uses `@nasa-gcn/remix-seo` to generate dynamic sitemaps:

**Location**: `apps/app/app/routes/_seo+/sitemap[.]xml.ts`

```typescript
import { generateSitemap } from '@nasa-gcn/remix-seo'

export function loader({ request }: LoaderFunctionArgs) {
	return generateSitemap(request, routes, {
		siteUrl: 'https://epicstartup.com',
		headers: {
			'Cache-Control': 'public, max-age=300', // 5 minutes
		},
	})
}
```

### Excluding Routes from Sitemap

Use the `SEOHandle` to exclude specific routes:

```typescript
import { type SEOHandle } from '@nasa-gcn/remix-seo'

export const handle: SEOHandle = {
	getSitemapEntries: () => null, // Exclude from sitemap
}
```

### Robots.txt

**Location**: `apps/app/app/routes/_seo+/robots[.]txt.ts`

```typescript
import { generateRobotsTxt } from '@nasa-gcn/remix-seo'

export function loader() {
	return generateRobotsTxt([
		{ type: 'sitemap', value: 'https://epicstartup.com/sitemap.xml' },
	])
}
```

### Environment-Based Indexing

Control indexing based on environment:

```typescript
// In root.tsx
const allowIndexing = ENV.ALLOW_INDEXING !== 'false'

robots: {
  index: allowIndexing,
  follow: allowIndexing,
}
```

**Environment Variables:**

```bash
# Production
ALLOW_INDEXING=true

# Staging/Development
ALLOW_INDEXING=false
```

## Route-Specific SEO

### Homepage

```typescript
export const meta: MetaFunction = ({ data, location }) => {
  return [
    ...generateSeoMeta({
      title: 'Epic Stack - Build your next startup even faster',
      description: 'Modern SaaS boilerplate that helps developers launch production-ready applications.',
      url: `https://epicstartup.com${location.pathname}`,
      type: 'website',
    }),
    structuredDataScriptTag(generateWebSiteSchema({...})),
  ]
}
```

### Product/Pricing Page

```typescript
const schema = generateProductSchema({
	name: 'Epic Stack Pro',
	description: 'Premium SaaS template',
	brand: 'Epic Stack',
	offers: {
		price: '99.00',
		priceCurrency: 'USD',
		availability: 'InStock',
	},
})
```

### User Profile (Public)

```typescript
const schema = generatePersonSchema({
	name: user.name,
	url: `https://epicstartup.com/users/${user.username}`,
	image: user.avatar,
	jobTitle: user.jobTitle,
})
```

## Best Practices

### 1. Title Tag Best Practices

- **Length**: 50-60 characters (avoid truncation)
- **Format**: `Page Title | Brand Name`
- **Keywords**: Include primary keyword near the beginning
- **Uniqueness**: Every page should have a unique title
- **Branding**: Include brand name for recognition

### 2. Meta Description Best Practices

- **Length**: 155-160 characters
- **Action-oriented**: Include calls-to-action
- **Keywords**: Include relevant keywords naturally
- **Unique**: Each page should have unique description
- **Compelling**: Make users want to click

### 3. Open Graph Image Best Practices

- **Size**: 1200x630 pixels (1.91:1 aspect ratio)
- **Text**: Keep text large and readable at small sizes
- **Branding**: Include your logo/brand
- **Contrast**: High contrast for visibility
- **File size**: Keep under 1MB for fast loading

### 4. Structured Data Best Practices

- **Accuracy**: Only include accurate information
- **Completeness**: Fill in as many fields as possible
- **Validation**: Test with Google's Rich Results Test
- **Updates**: Keep data current (especially dates, prices)
- **Relevance**: Only add schemas relevant to the page

### 5. URL Structure Best Practices

- **Lowercase**: Always use lowercase
- **Hyphens**: Use hyphens for word separation
- **Short**: Keep URLs as short as possible
- **Descriptive**: URLs should indicate page content
- **Canonical**: Always set canonical URLs

### 6. Mobile Optimization

- **Viewport**: Always set viewport meta tag (included in root)
- **Responsive**: Test on multiple device sizes
- **Touch**: Ensure touch targets are at least 44x44px
- **Speed**: Optimize for mobile network speeds

### 7. Page Speed

- **Images**: Optimize and lazy-load images (OpenImg handles this)
- **Code splitting**: Use dynamic imports
- **CDN**: Use CDN for static assets
- **Compression**: Enable gzip/brotli
- **Caching**: Set appropriate cache headers

## Testing and Validation

### Google Tools

1. **[Rich Results Test](https://search.google.com/test/rich-results)**
   - Test structured data
   - Preview rich snippets
   - Identify errors

2. **[Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)**
   - Check mobile optimization
   - Identify mobile usability issues

3. **[PageSpeed Insights](https://pagespeed.web.dev/)**
   - Measure performance
   - Get optimization suggestions
   - Check Core Web Vitals

4. **[Google Search Console](https://search.google.com/search-console)**
   - Monitor search performance
   - Submit sitemaps
   - Fix indexing issues

### Social Media Validators

1. **[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)**
   - Preview Open Graph tags
   - Clear Facebook cache
   - Fix scraping issues

2. **[Twitter Card Validator](https://cards-dev.twitter.com/validator)**
   - Preview Twitter Cards
   - Validate Twitter meta tags

3. **[LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)**
   - Preview LinkedIn shares
   - Debug Open Graph issues

### Browser Extensions

- **[META SEO inspector](https://chrome.google.com/webstore/detail/meta-seo-inspector)** -
  Chrome extension
- **[SEO Meta in 1 Click](https://chrome.google.com/webstore/detail/seo-meta-in-1-click)** -
  Multi-browser

### Command Line Testing

```bash
# Check meta tags with curl
curl -I https://epicstartup.com

# Fetch and parse HTML
curl https://epicstartup.com | grep -i "og:"

# Check sitemap
curl https://epicstartup.com/sitemap.xml

# Check robots.txt
curl https://epicstartup.com/robots.txt
```

## Troubleshooting

### Issue: Open Graph Image Not Showing

**Solutions:**

1. Verify image URL is absolute (not relative)
2. Check image is accessible (not behind auth)
3. Verify image meets size requirements (1200x630)
4. Clear Facebook cache in Sharing Debugger
5. Check Content-Type header is correct

### Issue: Structured Data Errors

**Solutions:**

1. Use Google's Rich Results Test
2. Verify all required fields are present
3. Check date formats (ISO 8601)
4. Ensure URLs are absolute
5. Validate JSON syntax

### Issue: Page Not Indexed

**Solutions:**

1. Check `ALLOW_INDEXING` environment variable
2. Verify robots meta tag allows indexing
3. Check robots.txt doesn't block
4. Submit sitemap to Google Search Console
5. Ensure canonical URL is correct

### Issue: Duplicate Content

**Solutions:**

1. Set canonical URLs on all pages
2. Use 301 redirects for old URLs
3. Consolidate similar pages
4. Use URL parameters correctly
5. Check for www vs non-www issues

### Issue: Slow Page Load

**Solutions:**

1. Optimize images with OpenImg
2. Enable code splitting
3. Use lazy loading for images
4. Implement proper caching
5. Minify CSS/JS
6. Use CDN for static assets

## Resources

### Official Documentation

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards)
- [React Router Meta](https://reactrouter.com/en/main/route/meta)

### Epic Stack Documentation

- `/docs/seo.md` - Basic SEO overview
- `/apps/web/SEO-GUIDE.md` - Marketing site SEO guide
- `/packages/seo/README.md` - SEO package documentation
- `/docs/image-optimization.md` - Image optimization guide

### Tools

- [Screaming Frog](https://www.screamingfrogseoseo.com/) - SEO spider tool
- [Ahrefs](https://ahrefs.com/) - SEO analysis platform
- [SEMrush](https://www.semrush.com/) - SEO toolkit
- [Moz](https://moz.com/) - SEO software

## Examples

### Complete Page Example

```typescript
// routes/features.tsx
import { type MetaFunction } from 'react-router'
import {
  generateSeoMeta,
  generateWebPageSchema,
  structuredDataScriptTag
} from '@repo/seo'

export const meta: MetaFunction = ({ location }) => {
  const schema = generateWebPageSchema({
    name: 'Features',
    url: `https://epicstartup.com${location.pathname}`,
    description: 'Explore the powerful features of Epic Stack',
  })

  return [
    ...generateSeoMeta({
      title: 'Features | Epic Stack',
      description: 'Explore the powerful features of Epic Stack including authentication, payments, background jobs, and more.',
      url: `https://epicstartup.com${location.pathname}`,
      keywords: ['features', 'saas', 'authentication', 'payments'],
    }),
    structuredDataScriptTag(schema),
  ]
}

export default function Features() {
  return <div>Features page</div>
}
```

---

**Last Updated**: 2025-11-19 **Version**: 1.0.0 **Maintainer**: Epic Stack Team
