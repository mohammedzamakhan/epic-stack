# @repo/seo

Comprehensive SEO utilities for React Router applications in the Epic Stack monorepo.

## Features

- 🏷️ **Meta Tags**: Generate complete SEO meta tags including Open Graph and Twitter Cards
- 🌐 **Structured Data**: Create Schema.org JSON-LD structured data for rich snippets
- 🤖 **Robots Control**: Fine-grained robots directives and sitemap integration
- 🔗 **Canonical URLs**: Proper canonical URL management
- 📱 **Social Media**: Optimized Open Graph and Twitter Card support
- 📊 **Analytics Ready**: Structured data for better search engine understanding

## Installation

This package is already part of the Epic Stack monorepo. To use it in any app:

```bash
cd apps/your-app
npm install @repo/seo@*
```

## Quick Start

### Basic Meta Tags

```typescript
import { type MetaFunction } from 'react-router'
import { generateSeoMeta } from '@repo/seo'

export const meta: MetaFunction = ({ location }) => {
  return generateSeoMeta({
    title: 'My Page Title',
    description: 'A compelling description of my page content',
    url: `https://example.com${location.pathname}`,
  })
}
```

### With Open Graph Image

```typescript
export const meta: MetaFunction = ({ data, location }) => {
  return generateSeoMeta({
    title: data.page.title,
    description: data.page.description,
    url: `https://example.com${location.pathname}`,
    image: {
      url: 'https://example.com/og-image.jpg',
      alt: 'Page image description',
      width: 1200,
      height: 630,
    },
    siteName: 'Epic Stack',
    twitter: {
      card: 'summary_large_image',
      site: '@epicstartup',
      creator: '@author',
    },
  })
}
```

### Article/Blog Post

```typescript
import { generateSeoMeta, generateArticleSchema, structuredDataScriptTag } from '@repo/seo'

export const meta: MetaFunction = ({ data, location }) => {
  const schema = generateArticleSchema({
    headline: data.post.title,
    description: data.post.excerpt,
    image: data.post.coverImage,
    datePublished: data.post.publishedAt,
    dateModified: data.post.updatedAt,
    author: {
      name: data.post.author.name,
      url: `https://example.com/authors/${data.post.author.slug}`,
    },
    publisher: {
      name: 'Epic Stack',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
    },
  })

  return [
    ...generateSeoMeta({
      title: data.post.title,
      description: data.post.excerpt,
      url: `https://example.com${location.pathname}`,
      type: 'article',
      image: {
        url: data.post.coverImage,
        alt: data.post.title,
      },
      article: {
        publishedTime: data.post.publishedAt,
        modifiedTime: data.post.updatedAt,
        author: data.post.author.name,
        section: data.post.category,
        tags: data.post.tags,
      },
    }),
    structuredDataScriptTag(schema),
  ]
}
```

## API Reference

### `generateSeoMeta(options)`

Generate comprehensive SEO meta tags.

**Options:**

```typescript
interface GenerateSeoMetaOptions {
  title: string                    // Page title (required)
  description: string              // Page description (required)
  url?: string                     // Canonical URL
  image?: SeoImage                 // Open Graph image
  type?: 'website' | 'article'     // Open Graph type (default: 'website')
  siteName?: string                // Site name for OG
  locale?: string                  // Locale (default: 'en_US')
  article?: SeoArticle             // Article metadata
  twitter?: SeoTwitter             // Twitter settings
  keywords?: string[]              // Meta keywords
  author?: string                  // Author name
  robots?: SeoRobots              // Robots directives
  additionalMeta?: Array<{...}>   // Additional meta tags
  additionalLinks?: Array<{...}>  // Additional link tags
}
```

**Returns:** Array of meta/link tag objects for React Router

### Structured Data Functions

#### `generateOrganizationSchema(org)`

Create Organization schema for your company/brand.

```typescript
const schema = generateOrganizationSchema({
  name: 'Epic Stack',
  url: 'https://example.com',
  logo: 'https://example.com/logo.png',
  description: 'Production-ready full-stack SaaS template',
  sameAs: [
    'https://twitter.com/epicstartup',
    'https://github.com/epic-stack',
  ],
})
```

#### `generateWebSiteSchema(site)`

Create WebSite schema with search action (for homepage).

```typescript
const schema = generateWebSiteSchema({
  name: 'Epic Stack',
  url: 'https://example.com',
  description: 'Full-stack SaaS template',
  potentialAction: {
    type: 'SearchAction',
    target: 'https://example.com/search?q={search_term_string}',
    queryInput: 'required name=search_term_string',
  },
})
```

#### `generateArticleSchema(article)`

Create Article schema for blog posts.

```typescript
const schema = generateArticleSchema({
  headline: 'How to Build SaaS Apps',
  description: 'Complete guide...',
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
  keywords: ['saas', 'react', 'typescript'],
})
```

#### `generateBreadcrumbSchema(breadcrumb)`

Create BreadcrumbList schema for navigation.

```typescript
const schema = generateBreadcrumbSchema({
  itemListElement: [
    { name: 'Home', item: 'https://example.com', position: 1 },
    { name: 'Blog', item: 'https://example.com/blog', position: 2 },
    { name: 'Article Title', position: 3 },
  ],
})
```

#### `generateFAQPageSchema(faqs)`

Create FAQPage schema for FAQ pages.

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

#### `generateProductSchema(product)`

Create Product schema for e-commerce/SaaS products.

```typescript
const schema = generateProductSchema({
  name: 'Epic Stack Pro',
  description: 'Premium SaaS template',
  image: 'https://example.com/product.jpg',
  brand: 'Epic Stack',
  offers: {
    price: '99.00',
    priceCurrency: 'USD',
    availability: 'InStock',
    url: 'https://example.com/pricing',
  },
  aggregateRating: {
    ratingValue: 4.8,
    reviewCount: 127,
  },
})
```

### Helper Functions

#### `truncateDescription(text, maxLength?)`

Truncate text to optimal SEO description length (default: 160 characters).

```typescript
const description = truncateDescription(longText, 160)
```

#### `generateTitle(pageTitle, siteName?, separator?)`

Combine page title with site name.

```typescript
const title = generateTitle('About Us', 'Epic Stack', '|')
// Returns: "About Us | Epic Stack"
```

#### `extractDescription(content, maxLength?)`

Extract plain text description from HTML or Markdown content.

```typescript
const description = extractDescription(htmlContent, 160)
```

## Best Practices

### 1. Title Optimization

- Keep titles between 50-60 characters
- Include primary keyword near the beginning
- Make titles unique for each page
- Include your brand name

```typescript
generateSeoMeta({
  title: 'SEO Best Practices | Epic Stack',
  // ...
})
```

### 2. Description Optimization

- Keep descriptions between 155-160 characters
- Include a clear call-to-action
- Use active voice
- Include target keywords naturally

```typescript
generateSeoMeta({
  title: 'My Page',
  description: truncateDescription(
    'Learn how to build production-ready SaaS applications with Epic Stack. Get started with our comprehensive guides and templates today.',
    160
  ),
})
```

### 3. Image Optimization

- Use 1200x630px for Open Graph images
- Always include alt text
- Use descriptive file names
- Compress images for faster loading

```typescript
image: {
  url: 'https://example.com/images/seo-guide-og.jpg',
  alt: 'SEO Guide illustration showing meta tags',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}
```

### 4. Structured Data

- Add structured data to all major content types
- Validate with Google's Rich Results Test
- Keep data accurate and up-to-date
- Test for mobile rendering

### 5. Canonical URLs

- Always set canonical URLs to avoid duplicate content
- Use absolute URLs (not relative)
- Match URL protocol (HTTP/HTTPS)

```typescript
generateSeoMeta({
  url: `https://example.com${location.pathname}`,
  // ...
})
```

### 6. Robots Control

```typescript
// Allow indexing (default)
robots: {
  index: true,
  follow: true,
  maxImagePreview: 'large',
}

// Prevent indexing (staging, dev environments)
robots: {
  index: false,
  follow: false,
}
```

## Testing

### Google Tools

- [Rich Results Test](https://search.google.com/test/rich-results) - Test structured data
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) - Check mobile optimization
- [PageSpeed Insights](https://pagespeed.web.dev/) - Performance and Core Web Vitals

### Social Media Validators

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Browser Extensions

- [META SEO inspector](https://chrome.google.com/webstore/detail/meta-seo-inspector)
- [SEO Meta in 1 Click](https://chrome.google.com/webstore/detail/seo-meta-in-1-click)

## Examples

See the `/apps/web` (Astro marketing site) for comprehensive SEO implementation examples:

- `/apps/web/src/components/SEO.astro` - Full SEO component implementation
- `/apps/web/SEO-GUIDE.md` - Detailed SEO guide
- `/apps/web/src/pages/blog/[slug].astro` - Article SEO example

## Resources

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [React Router Meta Function](https://reactrouter.com/en/main/route/meta)

## License

Part of Epic Stack - MIT License
