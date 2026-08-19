# CMS (Payload)

This is the Epic Startup **CMS**: a [Payload CMS](https://payloadcms.com)
admin panel and API that powers content (pages, posts, categories, media,
site header/footer/banner) for the marketing site at
[`apps/web`](../web). Unlike the upstream
[Payload Website Template](https://github.com/payloadcms/payload/blob/main/templates/website)
this is based on, **the public front-end lives in `apps/web`** (Astro),
which fetches content from this app's REST/GraphQL API and renders it with
its own layout blocks (`apps/web/src/components/blocks`). This app itself
only serves the Payload admin panel and API — there is no public
`(pages)`/`(posts)` front-end route here.

Core features:

- [Pre-configured Payload Config](#how-it-works)
- [Authentication](#users-authentication)
- [Access Control](#access-control)
- [Lexical editor](#lexical-editor)
- [Draft Preview](#draft-preview)
- [Live Preview](#live-preview)
- [On-demand Revalidation](#on-demand-revalidation)
- [SEO](#seo)
- [Search](#search)
- [Redirects](#redirects)
- [Jobs and Scheduled Publishing](#jobs-and-scheduled-publish)

## Storage Configuration

Today this app uses **local file storage in every environment**:

- Files are stored in the `public/media/` directory and served directly by
  Next.js
- No cloud storage credentials are required to run it
- [`wrangler.jsonc`](./wrangler.jsonc) declares an `R2_BUCKET` binding, and
  `@payloadcms/storage-r2` is a listed dependency, but no R2 plugin is
  registered in `payload.config.ts` yet — production does not actually use R2
- No `USE_S3_STORAGE` toggle here — that variable only applies to the
  unrelated App/Admin Tigris storage

See [CMS Storage Documentation](../../docs/cms-storage.md) for the full
picture, including what it would take to wire R2 in.

## Database

Payload uses [`@payloadcms/db-sqlite`](https://payloadcms.com/docs/database/sqlite)
pointed at a local SQLite file (`apps/cms/data/cms.db`) — in every
environment, including the deployed Worker, since the `D1` binding declared
in `wrangler.jsonc` is not yet wired into the adapter. There is no Postgres
or MongoDB adapter in this app. See
[CMS storage](../../docs/cms-storage.md) for details.

## Quick Start

This app is part of the `epic-startup` monorepo; you don't clone it
standalone.

1. From the monorepo root, run initial setup if you haven't already (see the
   repo's top-level `AGENTS.md`)
2. Create `apps/cms/.env` (gitignored) with the variables documented in
   [`apps/cms/.env.schema`](./.env.schema) and fill in required secrets
3. Start the CMS on its own:
   ```bash
   npm run dev:cms
   ```
   or start it alongside the rest of the stack from the repo root:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3006/admin` and follow the on-screen instructions
   to create your first admin user

## How it works

The Payload config is tailored specifically to the needs of this monorepo. It
is pre-configured in the following ways:

### Collections

See the [Collections](https://payloadcms.com/docs/configuration/collections)
docs for details on how to extend this functionality.

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel and
  unpublished content. See [Access Control](#access-control) for more
  details.

- #### Posts

  Posts are used to generate blog posts consumed by `apps/web`. All posts are
  layout builder enabled so `apps/web` can render unique layouts per post
  using its own layout-building blocks. Posts are also draft-enabled so you
  can preview them before publishing, see [Draft Preview](#draft-preview)
  for more details.

- #### Pages

  All pages are layout builder enabled so `apps/web` can render unique
  layouts per page. Pages are also draft-enabled, see
  [Draft Preview](#draft-preview) for more details.

- #### Media

  This is the uploads-enabled collection used by pages and posts to contain
  media like images and other assets. Currently stored locally in every
  environment — see [Storage Configuration](#storage-configuration).

- #### Categories

  A taxonomy used to group posts together. Categories can be nested inside of
  one another, for example "News > Technology". See the official
  [Payload Nested Docs Plugin](https://payloadcms.com/docs/plugins/nested-docs)
  for more details.

### Globals

See the [Globals](https://payloadcms.com/docs/configuration/globals) docs for
details on how to extend this functionality.

- `Header` — data required by `apps/web`'s header, like nav links.
- `Footer` — same as above but for the footer.
- `Banner` — site-wide announcement banner content.

## Access control

Basic access control is setup to limit access to various content based on
publishing status.

- `users`: Users can access the admin panel and create or edit content.
- `posts`: Everyone can access published posts, but only users can create,
  update, or delete them.
- `pages`: Everyone can access published pages, but only users can create,
  update, or delete them.

For more details on how to extend this functionality, see the
[Payload Access Control](https://payloadcms.com/docs/access-control/overview#access-control)
docs.

## Lexical editor

A deep editorial experience that allows complete freedom to focus just on
writing content without breaking out of the flow, with support for Payload
blocks, media, links and other features provided out of the box. See
[Lexical](https://payloadcms.com/docs/rich-text/overview) docs.

## Draft Preview

Posts and pages are draft-enabled so you can preview them before publishing.
These collections use
[Versions](https://payloadcms.com/docs/configuration/collections#versions)
with `drafts` set to `true`: a new document is saved as a draft and is not
visible on `apps/web` until published. An `afterChange` hook regenerates
`apps/web` when a document's `_status` becomes `published`.

For more details on how to extend this functionality, see the official
[Draft Preview Example](https://github.com/payloadcms/payload/tree/examples/draft-preview).

## Live preview

In addition to draft previews, live preview lets you view the resulting
`apps/web` page as you edit content. See
[Live preview docs](https://payloadcms.com/docs/live-preview/overview) for
more details.

## On-demand Revalidation

Hooks on collections and globals mean page, post, footer, or header changes
are reflected in `apps/web` via on-demand revalidation.

## SEO

This app is pre-configured with the official
[Payload SEO Plugin](https://payloadcms.com/docs/plugins/seo) for SEO control
from the admin panel. SEO data is consumed by `apps/web`.

## Search

Pre-configured with the official
[Payload Search Plugin](https://payloadcms.com/docs/plugins/search) so
`apps/web` can implement search over published posts.

## Redirects

Use the `redirects` collection to create a proper redirect from old URLs to
new ones on `apps/web`. This app is pre-configured with the official
[Payload Redirects Plugin](https://payloadcms.com/docs/plugins/redirects) for
redirect control from the admin panel.

## Jobs and Scheduled Publish

[Scheduled Publish](https://payloadcms.com/docs/versions/drafts#scheduled-publish)
uses the [jobs queue](https://payloadcms.com/docs/jobs-queue/jobs) to publish
or unpublish content on a schedule.

## Development

To spin up this app locally, follow the [Quick Start](#quick-start).

### Seed

To seed the database with a few pages, posts, and projects you can click the
'seed database' link from the admin panel.

The seed script will also create a demo user for demonstration purposes only:

- Demo Author
  - Email: `demo-author@payloadcms.com`
  - Password: `password`

> NOTICE: seeding the database is destructive because it drops your current
> database to populate a fresh one from the seed template. Only run this
> command if you are starting a new project or can afford to lose your
> current data.

## Production and deployment

This app builds and deploys to **Cloudflare Workers** with
[OpenNext](https://opennext.js.org/cloudflare), not to Vercel, Payload Cloud,
or Fly.io. Relevant `apps/cms/package.json` scripts:

```bash
npm run build          # next build
npm run build:worker    # opennextjs-cloudflare build
npm run deploy:database # run Payload migrations (against the local SQLite
                         # file baked into the build — not D1, see below)
npm run deploy:app      # build + deploy the Worker
npm run deploy          # deploy:database + deploy:app
```

See [Deployment checklist](../../docs/deployment-checklist.md) for the
provisioning steps in place today (D1 database, R2 bucket, Worker secrets,
and the `deploy-cms` GitHub Actions job), and
[CMS storage](../../docs/cms-storage.md) for why the D1/R2 bindings aren't
actually used by Payload yet.

## Questions

If you have any issues or questions, reach out to us on
[Discord](https://discord.com/invite/payload) or start a
[GitHub discussion](https://github.com/payloadcms/payload/discussions).
