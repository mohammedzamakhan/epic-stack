# CMS Storage

The CMS (`apps/cms`, Payload CMS on Cloudflare Workers) uses different media
storage depending on environment. This is separate from the **App**'s Tigris
image storage — see [Image storage](./image-storage.md) for that. Do not confuse
the two: CMS media goes to Cloudflare R2, App/Admin user images go to Tigris.

## Development (default)

- Local file storage in `apps/cms/public/media/`
- No cloud credentials required; works fully offline
- Files are served directly by Next.js

## Production

- **Cloudflare R2** (S3-compatible object storage), bound to the Worker as the
  `R2_BUCKET` binding in [`apps/cms/wrangler.jsonc`](../apps/cms/wrangler.jsonc)
- The bucket is created with:
  ```bash
  cd apps/cms
  npx wrangler r2 bucket create epic-startup-cms-media
  ```
- [`@payloadcms/storage-r2`](https://payloadcms.com/docs/upload/storage-adapters#r2)
  is a dependency in `apps/cms/package.json` for this purpose; add it to the
  `plugins` array in `apps/cms/src/payload.config.ts` (it is not yet wired in as
  of this writing) to actually route uploads through the `R2_BUCKET` binding in
  production

## Configuration

Relevant variables, defined in
[`apps/cms/.env.schema`](../apps/cms/.env.schema):

```bash
# Only required in production; dev uses local file storage
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=epic-startup-cms-media
CLOUDFLARE_ACCOUNT_ID=
```

There is no `USE_S3_STORAGE` toggle for the CMS — that variable only applies to
the unrelated App/Admin Tigris storage described in
[Image storage](./image-storage.md). CMS storage is selected automatically:
local `public/media/` in development, R2 in the deployed Worker.

## Database

CMS content (pages, posts, media metadata) lives in Cloudflare **D1** (SQLite),
not the App/Admin Prisma database. Locally, Payload uses a plain SQLite file at
`apps/cms/data/cms.db` (via `@payloadcms/db-sqlite`); in production it talks to
D1 through the `D1` binding in `wrangler.jsonc`. See
[Deployment checklist](./deployment-checklist.md) for setup steps.
