# CMS Storage

The CMS (`apps/cms`, Payload) has its own storage story, separate from the
**App**'s Tigris image storage — see [Image storage](./image-storage.md). Do not
confuse the two.

## Default production: Vercel (free)

The Payload admin + API is too large for Cloudflare Workers' **free 3 MiB gzip**
script limit (~7 MiB today). The supported free production host is **Vercel
Hobby**.

| Concern  | Local `next dev`                     | Vercel Hobby                                | Cloudflare Workers (paid, 10 MiB)      |
| -------- | ------------------------------------ | ------------------------------------------- | -------------------------------------- |
| Database | SQLite file (`apps/cms/data/cms.db`) | Turso (`libsql://` + `DATABASE_AUTH_TOKEN`) | D1 binding `D1`                        |
| Media    | `public/media/`                      | Same R2 bucket via S3 API                   | Same R2 bucket via `R2_BUCKET` binding |
| Deploy   | `npm run dev:cms`                    | `npm run deploy:vercel`                     | `npm run deploy:cloudflare`            |

Switching Vercel → Cloudflare later is env + host, not a rewrite: keep SQLite
(Turso or dump into D1) and keep the `epic-startup-cms-media` R2 bucket.

## How the adapters are chosen

[`apps/cms/src/platform.ts`](../apps/cms/src/platform.ts) picks implementations
at boot:

1. **Database**
   - Cloudflare Worker with a `D1` binding → `@payloadcms/db-d1-sqlite`
   - Otherwise → `@payloadcms/db-sqlite` with `DATABASE_URL` (file or Turso)
2. **Media**
   - Cloudflare Worker with `R2_BUCKET` → `@payloadcms/storage-r2`
   - `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + account/bucket →
     `@payloadcms/storage-s3` against the R2 S3 endpoint
   - Otherwise → local `staticDir`

`getCloudflareContext()` is skipped when `VERCEL` is set so OpenNext/wrangler
never run on the Hobby build.

## Vercel env

Create a Turso database (free [Starter plan](https://turso.tech/pricing)), then
set on the Vercel project:

```bash
DATABASE_URL=libsql://….turso.io
DATABASE_AUTH_TOKEN=
PAYLOAD_SECRET=
CRON_SECRET=
PREVIEW_SECRET=
NEXT_PUBLIC_SERVER_URL=https://<cms>.vercel.app
WEB_APP_URL=https://epic-startup.zama-887.workers.dev
# R2 S3 API (same bucket the Worker binding uses)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=epic-startup-cms-media
CLOUDFLARE_ACCOUNT_ID=8870705ba38bb749459b00ab2949f857
```

R2 S3 tokens are created in the Cloudflare dashboard under **R2 → Manage API
Tokens** ([docs](https://developers.cloudflare.com/r2/api/tokens/)).

Point `apps/web` `PUBLIC_CMS_URL` at the Vercel origin after the first deploy.

## Cloudflare Workers (optional, ~$5/mo)

Workers Paid raises the gzip limit to 10 MiB, which is enough for the current
OpenNext bundle. `wrangler.jsonc` already binds D1 `epic-startup-cms` and R2
`epic-startup-cms-media`. Then:

```bash
cd apps/cms
npx wrangler secret put PAYLOAD_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put PREVIEW_SECRET
npm run deploy:cloudflare
```

No S3 keys are required on Workers; the `R2_BUCKET` binding is used instead. The
smallest Cloudflare move is to keep the same Turso `DATABASE_URL` as Worker
secrets so you do not copy data into D1. D1 is only needed if you want to drop
Turso.

## Configuration reference

Variables are defined in [`apps/cms/.env.schema`](../apps/cms/.env.schema).
