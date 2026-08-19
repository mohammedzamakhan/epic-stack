# CMS Storage

The CMS (`apps/cms`, Payload CMS on Cloudflare Workers) has its own storage
story, separate from the **App**'s Tigris image storage — see
[Image storage](./image-storage.md) for that. Do not confuse the two: CMS
storage is described below; App/Admin user images go to Tigris.

## Current state (as shipped)

As of this writing, Payload is configured to use **local storage only, in every
environment**:

- [`apps/cms/src/payload.config.ts`](../apps/cms/src/payload.config.ts) uses
  `sqliteAdapter` from `@payloadcms/db-sqlite`, pointed at a local SQLite file
  (`apps/cms/data/cms.db`, or `DATABASE_URL` if it's set to something other than
  a `file:.`-prefixed path)
- [`apps/cms/src/collections/Media.ts`](../apps/cms/src/collections/Media.ts)
  sets `staticDir` to `apps/cms/public/media/` unconditionally — there is no
  environment check
- No `@payloadcms/storage-r2` plugin is registered in `payload.config.ts`'s
  `plugins` array, even though it's already a dependency in
  `apps/cms/package.json`

Practically: content and media are stored locally regardless of whether you're
running `npm run dev:cms` or the deployed Worker. Nothing currently routes
through Cloudflare D1 or R2.

## Declared, not-yet-wired production infrastructure

[`apps/cms/wrangler.jsonc`](../apps/cms/wrangler.jsonc) declares two Cloudflare
bindings for the Worker, created via the commands in
[Deployment checklist](./deployment-checklist.md):

- `D1` — a Cloudflare D1 (SQLite) database, created with `wrangler d1 create`
- `R2_BUCKET` — an R2 bucket for media, created with `wrangler r2 bucket create`

[`apps/cms/.env.schema`](../apps/cms/.env.schema) also documents the R2
credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
`CLOUDFLARE_ACCOUNT_ID`) that `@payloadcms/storage-r2` would need.

Creating the D1 database and R2 bucket, and setting these variables, does
**not** by itself make Payload use them — that requires code changes that
haven't been made yet:

1. Point the SQLite adapter at the `D1` binding instead of a local file path
   (Payload's Cloudflare/D1 support requires passing the binding through to
   `sqliteAdapter`, not just setting `DATABASE_URL`)
2. Add `@payloadcms/storage-r2` to the `plugins` array in `payload.config.ts`,
   configured for the `media` collection and the `R2_BUCKET` binding/credentials

## Configuration

Relevant variables, defined in
[`apps/cms/.env.schema`](../apps/cms/.env.schema):

```bash
# Not currently read anywhere in apps/cms/src — see "Declared, not-yet-wired" above
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=epic-startup-cms-media
CLOUDFLARE_ACCOUNT_ID=
```

There is no `USE_S3_STORAGE` toggle for the CMS — that variable only applies to
the unrelated App/Admin Tigris storage described in
[Image storage](./image-storage.md).

## Database

CMS content (pages, posts, media metadata) is intended to live in Cloudflare
**D1** in production, separate from the App/Admin Prisma database — but per
above, the code currently always uses a local SQLite file via
`@payloadcms/db-sqlite`, including in the `deploy-cms` GitHub Actions job (which
runs `payload migrate` against that local file, not the `D1` binding). See
[Deployment checklist](./deployment-checklist.md) for the D1/R2 provisioning
steps that are in place today.
