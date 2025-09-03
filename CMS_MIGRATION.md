# CMS to Astro Migration

This document describes the migration of frontend pages from the Payload CMS app to the Astro web app.

## Architecture

- **CMS App** (`/apps/cms`): Contains only Payload admin interface and API endpoints
- **Web App** (`/apps/web`): Contains the public-facing website including blog pages

## Setup

### 1. Environment Variables

Add the following to `/apps/web/.env`:
```
CMS_URL=http://localhost:3001
```

### 2. Start Both Applications

```bash
# Terminal 1 - Start CMS (admin + API)
cd apps/cms
npm run dev

# Terminal 2 - Start Web App (public site)
cd apps/web
npm run dev
```

The CMS admin will be available at `http://localhost:3001/admin`
The public website will be available at `http://localhost:3002`

## Content Flow

1. **Content Creation**: Editors use the CMS admin interface at `localhost:3001/admin`
2. **API Access**: Astro fetches content via REST API from `localhost:3001/api`
3. **Static Generation**: Astro generates static pages at build time using CMS content

## Available Pages

### CMS App (localhost:3001)
- `/admin` - Payload admin interface
- `/api/*` - REST API endpoints
- `/api/graphql` - GraphQL endpoint

### Web App (localhost:3002)
- `/` - Homepage
- `/posts` - Blog listing page
- `/posts/page/[page]` - Paginated blog listing
- `/posts/[slug]` - Individual blog post
- `/about`, `/pricing`, etc. - Static marketing pages

## Development Workflow

1. **Create Content**: Use CMS admin to create posts, pages, etc.
2. **View Content**: Visit the web app to see the content rendered
3. **Build for Production**: Run `npm run build` in the web app directory

## Components Migrated

The following components were migrated from CMS to Astro:

- `CollectionArchive` - Displays grid of blog posts
- `Card` - Individual post card component
- `Pagination` - Page navigation component

## API Integration

The web app uses a custom CMS client (`/src/lib/cms.ts`) that:
- Fetches data from Payload REST API
- Provides TypeScript interfaces for content types
- Handles error cases gracefully

## Notes

- The frontend routes have been removed from the CMS app
- A backup of the original frontend code is available at `/apps/cms/src/app/(frontend).backup`
- CORS is configured to allow requests from the Astro app
- Static generation is used for optimal performance