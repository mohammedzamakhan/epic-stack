# Open Graph Images

This directory contains Open Graph (OG) images used for social media sharing.

## Default OG Image

Place your default Open Graph image here as `og-image.jpg` with the following specifications:

### Recommended Specifications

- **Dimensions**: 1200x630 pixels
- **Aspect Ratio**: 1.91:1
- **File Format**: JPG, PNG, or WebP
- **File Size**: Under 1MB (optimally under 500KB)
- **Color Space**: sRGB

### Design Guidelines

1. **Text**: Use large, bold text that's readable at small sizes
2. **Branding**: Include your logo and brand colors
3. **Contrast**: Ensure high contrast for visibility on different backgrounds
4. **Safe Zone**: Keep important content within 1140x570px center area (avoid edges)
5. **Mobile**: Remember it will be displayed small on mobile devices

### Testing Your OG Image

Test how your OG image appears on different platforms:

- **Facebook**: [Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **Twitter**: [Card Validator](https://cards-dev.twitter.com/validator)
- **LinkedIn**: [Post Inspector](https://www.linkedin.com/post-inspector/)

## Creating an OG Image

### Option 1: Design Tools

- Figma/Sketch/Adobe XD with 1200x630px canvas
- Canva with "Facebook Post" template
- Photoshop with social media templates

### Option 2: Code-Based Tools

- [Cloudinary](https://cloudinary.com/) - Dynamic image generation
- [Satori](https://github.com/vercel/satori) - HTML/CSS to image
- [Puppeteer](https://pptr.dev/) - Screenshot generation

### Option 3: Templates

Free OG image templates:
- [Figma Community](https://www.figma.com/community/search?model_type=files&q=og%20image)
- [Canva Templates](https://www.canva.com/templates/)
- [Unsplash](https://unsplash.com/) - Free stock photos

## Example OG Image Structure

```
┌─────────────────────────────────────────┐
│  LOGO     Epic Stack                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   Your Page Title Here          │   │
│  │   Goes on Multiple Lines        │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Brief description or tagline           │
│                                         │
│  epicstartup.com                        │
└─────────────────────────────────────────┘
```

## Per-Page OG Images

While this directory contains the default OG image, you can specify custom OG images per-page in your route's meta function:

```typescript
export const meta: MetaFunction = ({ location }) => {
  return generateSeoMeta({
    title: 'My Page',
    description: 'My page description',
    image: {
      url: '/images/my-page-og.jpg',
      alt: 'My page image description',
      width: 1200,
      height: 630,
    },
  })
}
```

## Dynamic OG Images

For dynamic content (blog posts, products, etc.), consider generating OG images on-the-fly using:

1. **Server-side rendering**: Use Puppeteer or similar to screenshot HTML
2. **Image manipulation**: Use Sharp or Jimp to compose images
3. **Third-party services**: Use Cloudinary, Imgix, or similar services

## Resources

- [Open Graph Protocol](https://ogp.me/)
- [Facebook Sharing Best Practices](https://developers.facebook.com/docs/sharing/best-practices)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [LinkedIn Post Inspector](https://www.linkedin.com/help/linkedin/answer/a521928)

## Current Status

⚠️ **Action Required**: Add your default `og-image.jpg` to this directory

Default OG image referenced in:
- `apps/app/app/utils/seo.server.ts` - Main app SEO configuration
- Update `DEFAULT_OG_IMAGE` constant after adding the file
