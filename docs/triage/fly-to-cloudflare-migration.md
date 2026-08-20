# Triage: Migrate `apps/app` and `apps/admin` from Fly.io to Cloudflare

> **Status:** Triage complete. Spec and implementation are separate stages.
> **Requested by:** Slack user `U0965JK74NB` (DM `D0BR9CRRR1T`)
> **Thread:** https://testing-epic.slack.com/archives/D0BR9CRRR1T/p1787187788816399
> **Factory label:** `factory:epic-startup-factory`
> **Note:** GitHub Issues are disabled on `mohammedzamakhan/epic-startup`, so this document is the durable work-item record (tracked via factory draft PR / Discussion).

## Description

The requester wants a **detailed, one-shottable plan** to move operator-facing **`apps/app`** and **`apps/admin`** (and everything they use: control-plane database, background jobs, object storage, rate limiting/WAF, CI/CD) **off Fly.io onto Cloudflare**.

They explicitly asked for:

1. Deep research of the current stack and Cloudflare capabilities.
2. Full environment-variable inventory.
3. Identification of things that will not run on Cloudflare as-is (Arcjet called out by name).
4. Background jobs currently on Trigger.dev, with preference to move to **Cloudflare Workflows** if possible.
5. A plan detailed enough that another model could implement it end-to-end.

**This triage document does not design the target architecture or write that plan.** It establishes ground truth for the spec agent.

### Scope boundary (critical)

| In scope | Out of scope (do not break) |
| --- | --- |
| `apps/app` (Fly `epic-startup`) | `apps/tenant-api` regional customer PII plane (OCI Ashburn + Riyadh) |
| `apps/admin` (Fly `epic-startup-admin`) | `packages/tenant-db` per-org customer SQLite |
| Shared control-plane DB (`packages/database` Prisma + LiteFS SQLite) | Sites customer auth (`localStorage` tokens; no Sites BFF) |
| App/Admin cache SQLite, Tigris storage used by app/admin | CMS already on Cloudflare Workers; web/sites already on Cloudflare Pages |
| `@repo/background-jobs` (Trigger.dev) | Moving KSA customer PII onto US Cloudflare |

Canonical residency docs: `docs/tenant-data-residency.md`, `docs/decisions/045-tenant-data-residency.md`.

---

## 1. What `apps/app` and `apps/admin` actually are

### Runtime / framework

| Aspect | App | Admin |
| --- | --- | --- |
| Framework | React Router 7 (`react-router` ^8.3.0) SSR | Same |
| Server adapter | **Express** via `@react-router/express` | Same |
| Node | `^22.18.0` (Volta pin 22.18.0) | Same |
| Entrypoint | `apps/app/index.ts` → `server/index.ts` | `apps/admin/index.ts` → `server/index.ts` |
| Prod start | `cross-env NODE_ENV=production node index.ts` | Same |
| Env loading | `varlock/auto-load` + `varlock/env` (`ENV.*`) | Same |
| Build | `react-router build` (Vite 6) | Same |
| SSR config | `apps/app/react-router.config.ts` (`ssr: true`, Sentry upload on prod) | Same pattern |

There is **no** `@react-router/cloudflare` / Workers adapter today. The production path is a long-lived Node HTTP server.

### Server stack (long-lived Node process assumptions)

Both `apps/*/server/index.ts`:

- Create an **Express** app, `app.listen(PORT)`.
- `trust proxy = true` (Fly as edge).
- HTTPS redirect via `X-Forwarded-Proto`.
- `compression`, `@nichtsam/helmet/node-http`, `express-rate-limit` (in-memory, keyed by `fly-client-ip`).
- Static assets from `build/client` via `express.static`.
- **IP blacklist middleware** with `setImmediate` after response + **`setInterval` every 5 minutes** for in-memory cleanup (`@repo/common/ip-tracking`).
- Graceful shutdown via `close-with-grace`.
- Optional Sentry init (`@sentry/react-router`, `@sentry/profiling-node`).

React Router request handler: `apps/*/server/app.ts` → `createRequestHandler` from `@react-router/express`.

### Long-lived / non-request behaviors found in app code

| Behavior | Location | Cloudflare concern |
| --- | --- | --- |
| Process-level `setInterval` (IP counters) | `apps/app/server/index.ts`, `apps/admin/server/index.ts` | No durable process; isolate recycling |
| SSE notification stream with 3s DB poll + 30s keepalive | `apps/app/app/routes/api+/notifications+/stream.tsx` | Long-lived connection OK on Workers while client connected, but polling model + multi-isolate state |
| In-process LRU cache (5000 entries) | `packages/cache/src/cache.server.ts` | Per-isolate only; not shared |
| Image transform disk cache under `/data/images` | `apps/app/app/routes/resources+/images.tsx` (`openimg/node`) | No persistent local disk; needs R2/Images/KV |
| LiteFS primary/replica coordination | `litefs-js`, cache write-through to primary | Fly/Consul-only |
| MCP streamable HTTP | `apps/app/app/utils/mcp/streamable-http.server.ts` | Streaming + long requests |
| Session cookies | `packages/auth/src/session.server.ts` (`createCookieSessionStorage`, cookie `en_session`) | Portable if secrets preserved |

No first-party WebSocket server found in app/admin for product features (root monorepo has `ws` dependency used elsewhere). Playwright/Puppeteer are **test-only**, not production runtime.

### Docker / Fly / LiteFS

| File | Role |
| --- | --- |
| `apps/app/fly.toml` | App name `epic-startup`, region `sjc`, volume `data` → `/data`, internal 8080, health `/resources/healthcheck` + `/litefs/health` |
| `apps/admin/fly.toml` | App name `epic-startup-admin`, same pattern |
| `apps/app/other/Dockerfile` | `node:22-bookworm-slim`, fuse3/openssl/sqlite3, full monorepo npm ci, `prisma generate`, `npm run build` in apps/app, LiteFS 0.5.11, `CMD ["litefs", "mount"]` |
| `apps/admin/other/Dockerfile` | Same for admin |
| `apps/app/other/litefs.yml` | FUSE mount `${LITEFS_DIR}`, proxy 8080→8081, **Consul lease**, shared key `epic-startup-shared-db`, **candidate when region==primary**, runs `prisma migrate deploy` + WAL pragmas on candidate, then `npm start` |
| `apps/admin/other/litefs.yml` | **Same Consul key**, **`candidate: false`** (replica only), no migrations, `npm start` |

Dockerfile-baked runtime env (app):

```
FLY=true
LITEFS_DIR=/litefs/data
DATABASE_URL=file:$LITEFS_DIR/sqlite.db
CACHE_DATABASE_URL=file:$LITEFS_DIR/cache.db
INTERNAL_PORT=8080
PORT=8081
PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1
```

`INTERNAL_COMMAND_TOKEN` is generated at image build into `.env` (not only from Fly secrets).

**App and Admin share one LiteFS SQLite cluster** via Consul key `epic-startup-shared-db`. Admin is never primary.

### Health checks

- App: `apps/app/app/routes/resources+/healthcheck.tsx` — `prisma.user.count()`, self HEAD to `BASE_URL` host, security metrics.
- Admin: `apps/admin/app/routes/resources+/healthcheck.tsx` (same pattern).
- LiteFS: `/litefs/health` on proxy port.

---

## 2. Data layer

### Control plane (in migration scope)

| Item | Fact |
| --- | --- |
| Package | `@repo/database` → `packages/database` |
| ORM | Prisma Client `^6.19.2`, CLI `^6.8.2` |
| Provider | **SQLite** (`datasource db { provider = "sqlite" }`) |
| Schema | `packages/database/schema.prisma` — **58 models**, ~1199 lines, `previewFeatures = ["typedSql"]` |
| Binary targets | `native`, `darwin-arm64`, `linux-musl-openssl-3.0.x` |
| Client singleton | `packages/database/db.server.ts` — `remember('prisma', () => new PrismaClient(...)); void client.$connect()` |
| Migrations | `packages/database/migrations/` — **56** `migration.sql` files; deploy via `prisma migrate deploy` |
| Scripts | `db:generate` / `db:migrate:deploy` wrapped in `npx varlock run --` |
| Prod path | LiteFS FUSE file under `/litefs/data/sqlite.db` |
| Local path | `packages/database/db/data.db` (from `.env.schema`) |

### Cache layer (in scope)

| Item | Fact |
| --- | --- |
| Package | `@repo/cache` |
| Implementation | **Node built-in `node:sqlite` `DatabaseSync`** + file at `CACHE_DATABASE_PATH` |
| Plus | In-memory `lru-cache` (max 5000) |
| Multi-instance | Replicas POST cache updates to primary via LiteFS instance domain + `INTERNAL_COMMAND_TOKEN` (`packages/cache/src/cache_.sqlite.server.ts`) |

### Sessions

- Cookie session storage in `packages/auth/src/session.server.ts` (not DB-backed session blob store for the cookie itself).
- Prisma `Session` / `RefreshToken` models exist for server-side session rows and mobile/API JWT flows.
- Cookie name `en_session`; production domain `.${ROOT_APP}` when set.

### Tenant / customer plane (**out of scope**, boundary only)

- Customer PII lives in regional **Drizzle** SQLite on OCI (`packages/tenant-db`, `apps/tenant-api`).
- App only stores org flags on Prisma (`Organization.dataRegion`, `hasProvisionedDb`) and calls tenant-api with `{ orgId }` + `INTERNAL_COMMAND_TOKEN`.
- Env: `TENANT_API_URL`, `TENANT_API_URL_KSA`.
- Spec **must not** move customer PII into D1/Workers in the US or add a Sites auth BFF.

---

## 3. Background jobs inventory

### Confirmed: Trigger.dev is used

Package: `packages/background-jobs` (`@repo/background-jobs`).

Dependencies: `@trigger.dev/sdk` and `@trigger.dev/build` **^4.5.11** (also pinned in root `package.json` overrides).

Client API exported from `packages/background-jobs/src/client.ts` (only these triggers are exported):

| Export | Task id | Trigger type |
| --- | --- | --- |
| `triggerVideoProcessing` | `video-processing` | Event / manual (`tasks.trigger`) |
| `triggerImageProcessing` | `image-processing` | Event / manual |
| `triggerTransferS3Files` | `transfer-s3-files-cross-account` | Event / manual |
| `triggerAuditIntegrityBackfill` | `audit-integrity-backfill` | Event / manual (one-time SOC2 backfill) |

### All task definitions under `packages/background-jobs/src/tasks/`

| Task file | Task id | Type | Schedule / duration | Runtime deps | Notes |
| --- | --- | --- | --- | --- | --- |
| `video-processing.ts` | `video-processing` | `task()` | on-demand | **FFmpeg** (`fluent-ffmpeg`), `fs`, `os.tmpdir`, Prisma, S3 signed PUT, full video buffer in memory | Heavy native; downloads whole video |
| `image-processing.ts` | `image-processing` | `task()` | on-demand | **Jimp**, `fs`, `os.tmpdir`, Prisma, S3 | Thumbnail resize |
| `transfer-s3-files.ts` | `transfer-s3-files-cross-account` | `task()` | on-demand | `@aws-sdk/client-s3` dual clients | Cross-account/bucket copy; optional delete source |
| `audit-integrity-backfill.ts` | `audit-integrity-backfill` | `task()` | on-demand; **maxDuration 3600s** | `@repo/audit` `backfillIntegrityHashes` | Batched HMAC backfill |
| `audit-log-archival.ts` | `audit-log-archival` | **`schedules.task` cron `0 2 * * *`** | daily 02:00 UTC | `@repo/audit` `archiveOldLogs` | Retention |
| `gdpr-erasure.ts` | `gdpr-erasure-processor` | **`schedules.task` cron `0 4 * * *`** | daily 04:00 UTC | Prisma user delete + audit | GDPR Art. 17 processor |
| `mcp-token-cleanup.ts` | `mcp-token-cleanup` | **`schedules.task` cron `0 3 * * *`** | daily 03:00 UTC | Prisma delete expired MCP tokens | Cleanup |

### Trigger.dev deployment facts

- README documents `TRIGGER_PROJECT_ID`, `TRIGGER_SECRET_KEY`, `npx trigger.dev@latest init|dev|deploy`.
- **No `trigger.config.*` file is present in the repo** (init may be incomplete or config lives only in Trigger cloud / local untracked).
- **No GitHub Actions job deploys Trigger.dev** in `.github/workflows/deploy.yml`.
- Root script `dev:trigger` runs turbo filter `background-jobs` (package only has `tsc --watch`, not the Trigger CLI).
- Jobs also use storage env: `AWS_ENDPOINT_URL_S3`, `BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
- Image/video tasks poke `PRISMA_QUERY_ENGINE_LIBRARY` with darwin-arm64 paths (dev-oriented).

### Other background work (not Trigger.dev)

| Mechanism | Where | What |
| --- | --- | --- |
| Express `setInterval` 5 min | app/admin `server/index.ts` | IP request count cleanup |
| SSE poll every 3s | `api+/notifications+/stream.tsx` | Notification delivery |
| Root script `gdpr:process` | `scripts/process-gdpr-requests.mjs` | Alternate GDPR processing path |
| LiteFS exec on boot | `litefs.yml` | migrate deploy / WAL / prisma generate --sql |

### Cloudflare Workflows / Cron / Queues mapping feasibility (facts only)

| Current job | Fits Workflows/Queues/Cron? | Hard parts |
| --- | --- | --- |
| Cron audit archival, GDPR erasure, MCP cleanup | Cron Triggers or Workflow `schedules` + D1/Hyperdrive Prisma | Need DB access from Worker; GDPR deletes users |
| Image processing | Queue consumer or Workflow step | Jimp may work; no durable `/tmp` across isolates — use memory/R2; CPU limits |
| Video processing + FFmpeg | **Poor fit for pure Workers** | Needs native FFmpeg binary, large files, long CPU; Trigger/containers/external media service more realistic |
| S3 transfer | Workflow/Queue | Straightforward with R2/S3 APIs |
| Audit integrity backfill (1h) | Workflow multi-step | Step CPU limits; batching required |

Workers Paid CPU: default 30s, max **5 min** per invocation; Cron wall **15 min**; Workflows: durable multi-step, per-step CPU like Workers, sleep up to 365 days. Sources: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/).

---

## 4. Environment variable inventory

Sources: `apps/app/.env.schema`, `apps/admin/.env.schema`, `packages/database/.env.schema`, Dockerfile/litefs, and `process.env` / `ENV` reads across `apps/app`, `apps/admin`, and shared `packages/*`.

**Total unique keys observed in those trees: 111** (includes some package/test-only keys not in app `.env.schema`).

### Legend

- **Secret:** yes/no (from schema `@sensitive` or obvious credential)
- **Build vs runtime:** when required
- **Apps:** A=app schema, D=admin schema, P=packages/code

### Core runtime (required for prod app/admin)

| Variable | Secret | Build/Runtime | Apps | Readers / notes |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | no | both | A D | servers, sessions, many packages |
| `SESSION_SECRET` | **yes** | runtime | A D P | `packages/auth/src/session.server.ts` (comma-separated rotation list) |
| `HONEYPOT_SECRET` | **yes** | runtime | A D | `@repo/security` honeypot |
| `DATABASE_URL` | no (path) | runtime | A D P | Prisma; prod `file:/litefs/data/sqlite.db` |
| `DATABASE_PATH` | no | runtime | A D | schema / tooling |
| `CACHE_DATABASE_PATH` | no | runtime | A D | `@repo/cache` `node:sqlite` file |
| `LITEFS_DIR` | no | runtime | A D | LiteFS/Docker |
| `BASE_URL` | no | runtime | A D | healthcheck host validation, absolute URLs |
| `INTERNAL_COMMAND_TOKEN` | **yes** | runtime (+ Docker generates) | A D | cache primary updates, tenant provision, internal routes |
| `PORT` | no | runtime | code | app default 3001 / Docker 8081; admin default 3005 |
| `ALLOW_INDEXING` | no | runtime | A D | robots header middleware |

### Auth / security

| Variable | Secret | Build/Runtime | Apps | Notes |
| --- | --- | --- | --- | --- |
| `ARCJET_KEY` | **yes** | runtime | A | `packages/security/src/arcjet.server.ts`; used on login/signup/forgot-password/2FA/translate |
| `JWT_SECRET` | **yes** | runtime | A | `apps/app/app/utils/jwt.server.ts` API/mobile tokens |
| `IMPERSONATION_SESSION_SECRET` | **yes** | runtime | P | auth impersonation |
| `GITHUB_CLIENT_ID` | no | runtime | A D | OAuth login (`MOCK_` prefix in dev) |
| `GITHUB_CLIENT_SECRET` | **yes** | runtime | A D | |
| `GITHUB_TOKEN` | **yes** | runtime | A D | API token for GitHub features/mocks |
| `GITHUB_REDIRECT_URI` | no | runtime | A D | |
| `GOOGLE_CLIENT_ID` | no | runtime | P | Google OAuth provider package |
| `GOOGLE_CLIENT_SECRET` | **yes** | runtime | P | |
| `GOOGLE_REDIRECT_URI` | no | runtime | P | |
| `SSO_ENABLED` | no | runtime | A | |
| `SSO_ENCRYPTION_KEY` | **yes** | runtime | A | 64 hex / 32 bytes |
| `ROOT_APP` | no | runtime | A D | cookie domain parent |
| `MCP_ALLOWED_ORIGINS` | no | runtime | P/app | MCP CORS |

### Payments

| Variable | Secret | Build/Runtime | Apps | Notes |
| --- | --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | **yes** | runtime | A D | |
| `STRIPE_WEBHOOK_SECRET` | **yes** | runtime | A | webhook route |
| `STRIPE_PORTAL_URL` | no | runtime | A D | |
| `TRIAL_DAYS` | no | runtime | A D | |
| `CREDIT_CARD_REQUIRED_FOR_TRIAL` | no | runtime | A D | `stripe` \| `manual` |
| `LAUNCH_STATUS` | no | runtime | A D | `CLOSED_BETA` \| `PUBLIC_BETA` \| `LAUNCHED` |

### Object storage (Tigris / S3)

| Variable | Secret | Build/Runtime | Apps | Notes |
| --- | --- | --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | **yes** | runtime | A D | Tigris; also Trigger jobs |
| `AWS_SECRET_ACCESS_KEY` | **yes** | runtime | A D | |
| `AWS_REGION` | no | runtime | A D | often `auto` |
| `AWS_ENDPOINT_URL_S3` | no | runtime | A D | default `https://fly.storage.tigris.dev` |
| `BUCKET_NAME` | no | runtime | A D | |
| `USE_S3_STORAGE` | no | runtime | P | App/Admin force real S3 in dev |
| `S3_BUCKET_NAME` | no | runtime | P | alternate name in some storage code |

### Email / SMS / AI

| Variable | Secret | Build/Runtime | Apps | Notes |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | **yes** | runtime | A D | `@repo/email` |
| `TWILIO_ACCOUNT_SID` | no | runtime | A | SMS package (operator flows; KSA prod blocked for tenant) |
| `TWILIO_AUTH_TOKEN` | **yes** | runtime | A | |
| `TWILIO_FROM_NUMBER` | no | runtime | A | |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **yes** | runtime | A | AI features |
| `GOOGLE_API_KEY` | **yes** | runtime | A | Translate API for page builder |

### Integrations OAuth (app only)

`INTEGRATION_ENCRYPTION_KEY`, `INTEGRATIONS_OAUTH_STATE_SECRET`, and per-provider pairs:

`JIRA_*`, `SLACK_*`, `LINEAR_*`, `GITLAB_*`, `CLICKUP_*`, `NOTION_*`, `ASANA_*`, `TRELLO_*`, `GITHUB_INTEGRATION_*`

All client secrets sensitive; client IDs generally not.

### Discord

`DISCORD_INVITE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`

### Cloudflare for SaaS (custom hostnames for Sites — already CF)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_CUSTOM_HOSTNAME_CNAME_TARGET`

### Tenant plane URLs (must keep working after move)

`TENANT_API_URL`, `TENANT_API_URL_KSA` — app runtime.

(Related tenant-api-only, **not** app/admin but appear in package greps: `DATA_REGION`, `TENANT_DB_DIR`.)

### Observability

| Variable | Secret | Build/Runtime | Apps | Notes |
| --- | --- | --- | --- | --- |
| `SENTRY_DSN` | no (DSN) | runtime | A D | |
| `SENTRY_AUTH_TOKEN` | **yes** | **build** | A D | Docker `--mount=type=secret`, CI `SENTRY_AUTH_TOKEN` |
| `SENTRY_ORG` | no | build | A D | |
| `SENTRY_PROJECT` | no | build | A D | |
| `COMMIT_SHA` | no | build/runtime | Docker ARG | |
| `BETTERSTACK_API_KEY` | **yes** | runtime | A D | |
| `BETTERSTACK_URL` | no | runtime | A D | |
| `DATADOG_API_KEY` | **yes** | runtime | A | optional audit/obs |
| `NEW_RELIC_LICENSE_KEY` | **yes** | runtime | A | optional |
| `SLACK_WEBHOOK_URL` | no/sensitive URL | runtime | A | alerts |
| `PAGERDUTY_INTEGRATION_KEY` | **yes** | runtime | A | |
| `SERVICE_NAME` / `SERVICE_VERSION` | no | runtime | P observability | |

### Audit integrity

`AUDIT_LOG_SECRET_KEY`, `AUDIT_LOG_SECRET_KEYS`, `AUDIT_LOG_OLD_SECRET_KEY` — **yes** secret; HMAC for audit log integrity (`packages/audit`).

### Encryption helpers

`ENCRYPTION_KEY`, `INTEGRATION_ENCRYPTION_KEY`, `SSO_ENCRYPTION_KEY` — secrets.

### Fly-injected / platform

`FLY_REGION`, `FLY_APP_NAME`, `FLY` (Dockerfile), Consul via `FLY_CONSUL_URL` (LiteFS lease — not in `.env.schema` but required on Fly for LiteFS).

### Trigger.dev (documented; not in app `.env.schema`)

`TRIGGER_PROJECT_ID`, `TRIGGER_SECRET_KEY` — secrets; required where jobs run.

### Test / dev only

`MOCKS`, `PLAYWRIGHT_TEST_BASE_URL`, `CI`, `VITEST_POOL_ID`, `EXTENSION_ID`, `PRISMA_QUERY_ENGINE_LIBRARY`, various `SKIP_*`.

### CI secrets (GitHub Actions) for app/admin path

From `.github/workflows/deploy.yml`:

| Secret | Used for |
| --- | --- |
| `FLY_API_TOKEN` | container build + fly deploy app/admin |
| `SENTRY_AUTH_TOKEN` | production image build secret |
| `CLOUDFLARE_API_TOKEN` | web/sites/cms deploys (already CF) |
| `CLOUDFLARE_ACCOUNT_ID` | CF Pages/Workers deploys |
| `GITHUB_TOKEN` | GHCR push tenant-api |

App/admin **runtime** secrets on Fly are **not** fully listed in Actions (set via `fly secrets` / dashboard per `docs/deployment.md`): at minimum `SESSION_SECRET`, `HONEYPOT_SECRET`, Tigris keys from `fly storage create`, plus Stripe/Resend/OAuth/etc.

### Admin `.env.schema` is a subset

Admin does **not** declare integration OAuth, Arcjet, JWT, SSO, Twilio, tenant URLs, Discord bot, audit optional keys, etc. Admin still shares DB/cache/storage/session and can pull packages that read some of these if code paths execute.

---

## 5. Platform incompatibility inventory

Concrete usage sites. Spec chooses replacements.

| Dependency / feature | Usage sites | Why it breaks or degrades on Workers | Notes for spec |
| --- | --- | --- | --- |
| **Long-lived Express + Node listen** | `apps/*/server/index.ts` | Workers are request-scoped isolates, not `node:http` servers as currently structured | Need React Router Cloudflare adapter or `httpServerHandler` rewrite; drop Express middleware stack or reimplement |
| **LiteFS + FUSE + Consul + Fly volumes** | Dockerfiles, `litefs.yml`, `litefs-js` via `packages/common/src/litefs.server.ts`, cache primary routing | No FUSE volumes on Workers; Consul lease is Fly-specific | Entire HA SQLite topology must be replaced (D1 / Hyperdrive+Postgres / DO SQLite / external) |
| **Prisma native engine + file SQLite** | `packages/database`, binaryTargets include musl | Classic Prisma engine expects filesystem DB; Workers need **driver adapter** (`@prisma/adapter-d1` or pg/neon adapters) and different generate `runtime` | Schema is SQLite-shaped; 58 models, 56 migrations — non-trivial port. D1 max **10 GB/db**, single-threaded. Prisma Migrate on D1 still limited (diff + wrangler apply workflow). Sources: [Prisma D1 guide](https://www.prisma.io/docs/guides/deployment/cloudflare-d1), [D1 limits](https://developers.cloudflare.com/d1/reference/faq/) |
| **`node:sqlite` cache** | `packages/cache/src/cache.server.ts` | `node:sqlite` is a **non-functional stub** on Workers (compat date notes); needs KV/DO/D1 | Primary-forward write path is LiteFS-specific |
| **`express-rate-limit` in-memory** | `apps/*/server/index.ts` | Per-isolate; resets constantly | Use CF Rate Limiting, DO counters, or Arcjet |
| **Arcjet `@arcjet/remix`** | `packages/security/src/arcjet.server.ts`; routes: login/signup/forgot-password, `api+/auth.login`, `auth.login.2fa`, `api+/translate`, etc. | Official **Cloudflare Workers adapter still incomplete** historically ([arcjet-js#759](https://github.com/arcjet/arcjet-js/issues/759)); core `protect()` has runtime tests; **no first-class `@arcjet/remix` on workerd** guaranteed for current beta.9 | Remix SDK is Express/Node oriented. CF-in-front proxy helper `cloudflare()` exists for IP when app is **behind** CF, not the same as running **on** Workers. Spec must verify current Arcjet version support or replace (CF WAF, custom) |
| **Helmet `@nichtsam/helmet/node-http`** | `server/index.ts` | Node HTTP response API | Replace with web `Headers` security middleware |
| **`bcryptjs`** | `packages/auth` password/backup codes; app JWT token hashing | Pure JS — generally OK on Workers but CPU-heavy (cost factor 12) | Watch CPU time; WebCrypto/argon2 WASM alternatives possible |
| **`sharp` / `openimg/node`** | dependency; `resources+/images.tsx` uses `openimg/node` + **writable `/data`** | Native sharp; disk cache | Prefer Cloudflare Images, or R2 + WASM, or separate image worker |
| **Sentry Node profiling** | `@sentry/profiling-node`, server monitoring utils | Native profiler Node-oriented | Use Sentry Workers SDK |
| **Pino / wide-event middleware** | `@repo/observability` on Express | Needs request middleware rewrite | Workers Logs / tail |
| **Trigger.dev + FFmpeg + Jimp + fs tmp** | `packages/background-jobs` | Not a Worker; FFmpeg native binary unavailable on Workers | Workflows for light jobs; video likely stays external or Containers |
| **Tigris on Fly** | storage env default endpoint `fly.storage.tigris.dev` | Can keep S3 API or move to **R2** | Org-level custom S3 configs in DB |
| **IP header `fly-client-ip`** | rate limit keyGenerator, IP tracking | Must switch to `cf-connecting-ip` | Code comments already mention this |
| **SSE 3s polling stream** | notifications stream route | Works while connected; expensive at scale; no shared emitter | Consider DO/WebSocket/Queue |
| **MCP server routes** | `apps/app/app/routes/mcp+/*` | Streaming HTTP, sessions | Validate Worker compatibility |
| **`execa` / child_process** | dependency present | child_process stub/non-functional on Workers | Ensure prod paths don't spawn |
| **Varlock env at boot** | `varlock/auto-load` | Workers secrets via bindings/`.dev.vars`, not Node dotenv files | Rework config loading |
| **Monorepo Docker multi-GB image** | Dockerfiles copy whole monorepo | Workers bundle limit **3 MB free / 10 MB paid** compressed | Aggressive bundling; split services |
| **Shared DB between two apps via LiteFS** | app candidate + admin replica | Two Workers need one logical DB | Single D1 binding both, or service binding to data worker |
| **Playwright** | e2e only | N/A prod | Keep in CI |

### Cloudflare platform facts (research snapshot, Aug 2026)

| Product | Relevant facts | Source |
| --- | --- | --- |
| Workers Node compat | Broad Node API support; default on for compat date ≥ 2026-08-04; `node:sqlite` / `child_process` stubs | [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) |
| Workers limits (Paid) | CPU default 30s max 5 min; memory 128 MB; subrequests default 10k; worker size 10 MB; no HTTP duration hard limit while client connected | [Limits](https://developers.cloudflare.com/workers/platform/limits/) |
| D1 | SQLite; **10 GB max per DB**; single-threaded; Prisma via `@prisma/adapter-d1` | [D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/), Prisma docs |
| Hyperdrive | Pool/cache to **existing Postgres/MySQL** | CF storage options |
| Durable Objects | Strong consistency, DO storage/SQLite alams, coordination | CF docs |
| Workflows | Multi-step durable; cron schedules; step result 1 MiB; good for job orchestration | [Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/) |
| Queues | At-least-once; 128 KB msg; consumer wall 15 min | [Queues limits](https://developers.cloudflare.com/queues/platform/limits/) |
| Cron Triggers | UTC cron; 15 min wall; 250/account paid | [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) |
| KV / R2 | Session/config cache; blob storage no egress | CF storage guide |
| Already on CF in monorepo | `deploy-web`, `deploy-sites` → Pages; `deploy-cms` → Workers | `.github/workflows/deploy.yml` |

---

## 6. CI/CD and deploy surface

File: `.github/workflows/deploy.yml` (`🚀 Deploy`).

### Triggers

- Push `main` (production) and `dev` (staging)
- All pull_requests (CI only)

### Jobs (ordered conceptually)

1. `affected` — turbo filter vs base ref → outputs app/admin/web/cms/sites/tenant_api
2. `lint` — oxlint; runs DB migrate+generate
3. `typecheck` — rebuild sharp, migrate, **full monorepo build**, typecheck
4. `vitest` — unit tests + coverage
5. `playwright` — e2e (120 min timeout), seed DB
6. `deploy-web` / `deploy-sites` — Cloudflare Pages (secrets CF token/account)
7. `container-app` / `container-admin` — `flyctl deploy --build-only --push` with image label SHA; prod passes Sentry build secret
8. `container-tenant-api` — docker buildx `linux/arm64` → GHCR
9. `deploy-app` / `deploy-admin` — `flyctl deploy --image registry.fly.io/...:SHA` after CI+container
10. `deploy-cms` — Cloudflare Workers
11. `deploy-tenant-api` — SSH/OCI (later in file)

### Staging vs production split

| Branch | App Fly app | Admin Fly app |
| --- | --- | --- |
| `main` | `epic-startup` | `epic-startup-admin` |
| `dev` | `epic-startup-staging` | `epic-startup-admin-staging` (naming from fly.toml name + `-staging`) |

No Trigger.dev deploy job. No app/admin Wrangler config.

Other workflows: `lighthouse.yml`, `security.yml`.

---

## Acceptance criteria (for eventual migration work)

Spec/implementation later should satisfy:

1. `apps/app` and `apps/admin` serve production traffic on Cloudflare (or an explicitly approved hybrid) without Fly for those two apps.
2. Control-plane data remains consistent, migrated, and backed up; rollback plan documented.
3. Background jobs (all 7 Trigger tasks + cron semantics) have a defined home (Workflows/Queues/Cron and/or retained external runner for FFmpeg).
4. All required env/secrets inventoried above are mapped to Workers secrets/vars/bindings.
5. Tenant residency guarantees unchanged: no customer PII in US control plane; `TENANT_API_*` provision paths still work.
6. CI deploys app/admin via Wrangler/CF instead of flyctl containers.
7. Auth cookies, Stripe webhooks, OAuth callbacks, and custom domain flows updated for new origins.
8. Health checks and observability equivalent or better.

## Proposed solution direction (non-binding hints for spec)

Not decisions — pointers only:

- Largest fork in the road is **database**: D1+Prisma adapter vs Hyperdrive+Postgres vs DO SQLite vs keeping a small Node data plane.
- **Express → Workers** is a full server rewrite (RR7 Cloudflare template exists upstream; this monorepo is deep into Node APIs).
- **Video/FFmpeg** likely cannot move 1:1 onto Workflows; isolate as Containers/external.
- **Arcjet** needs version bump + Workers path verification or replacement.
- **R2** is natural Tigris replacement; S3-compatible org configs may remain.
- Admin+App sharing one DB is easier if both are Workers with the same D1/Hyperdrive binding.

## Complexity

**XL**

Cross-cutting platform migration: runtime, data, jobs, storage, security, CI, dual apps, shared SQLite HA, large Prisma schema, media pipeline, compliance jobs (GDPR/audit). High risk to auth and billing.

## Ambiguity / human decisions required

These need the requester (or product owner) — technical research cannot pick defaults without product/risk tradeoffs:

1. **Control-plane database target:** D1 (SQLite-like, 10 GB cap, edge) vs managed Postgres via Hyperdrive vs Durable Object SQLite vs hybrid. Affects cost, size headroom, multi-region, Prisma workflow.
2. **Keep any Node/container component?** e.g. FFmpeg video worker, or temporary dual-run on Fly during migration.
3. **Trigger.dev → Cloudflare Workflows only, or hybrid?** Video processing almost certainly needs an exception.
4. **Object storage:** stay on Tigris/S3 API vs migrate all objects to R2 (and org BYO S3).
5. **Arcjet:** wait/build Workers support vs replace with Cloudflare WAF + custom rate limits.
6. **Cutover strategy:** big-bang DNS vs shadow traffic vs long dual-write; downtime tolerance; who owns DNS.
7. **Admin and App:** single Worker with path routing vs two Workers; shared bindings.
8. **SSE notifications / MCP:** required feature parity on day one vs deferred.
9. **Staging topology on CF** equivalent to `dev` branch Fly apps.
10. **Budget/plan:** Workers Paid limits (CPU, size, D1) vs enterprise needs.

## References

### Code / config

- `apps/app/package.json`, `apps/admin/package.json`
- `apps/app/server/index.ts`, `apps/admin/server/index.ts`
- `apps/app/server/app.ts`, `apps/admin/server/app.ts`
- `apps/app/other/Dockerfile`, `apps/admin/other/Dockerfile`
- `apps/app/other/litefs.yml`, `apps/admin/other/litefs.yml`
- `apps/app/fly.toml`, `apps/admin/fly.toml`
- `apps/app/.env.schema`, `apps/admin/.env.schema`
- `packages/database/schema.prisma`, `packages/database/db.server.ts`, `packages/database/migrations/`
- `packages/cache/src/cache.server.ts`, `packages/cache/src/cache_.sqlite.server.ts`
- `packages/common/src/litefs.server.ts`
- `packages/background-jobs/**`
- `packages/security/src/arcjet.server.ts`
- `packages/auth/src/session.server.ts`
- `apps/app/app/routes/resources+/images.tsx`
- `apps/app/app/routes/api+/notifications+/stream.tsx`
- `apps/app/app/routes/api+/auth.login.ts` (Arcjet slidingWindow + detectBot)
- `.github/workflows/deploy.yml`
- `docs/deployment.md`, `docs/tenant-data-residency.md`, `docs/decisions/045-tenant-data-residency.md`
- `AGENTS.md`

### External

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- https://developers.cloudflare.com/d1/reference/faq/
- https://developers.cloudflare.com/workflows/reference/limits/
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://www.prisma.io/docs/guides/deployment/cloudflare-d1
- https://docs.arcjet.com/reference/remix/
- https://github.com/arcjet/arcjet-js/issues/759

### Slack request (verbatim summary)

Requester asked for a detailed plan to move `/app` and `/admin` to Cloudflare including database and background jobs (Trigger.dev → Workflows if possible), full env review, and replacements for Arcjet and other non-portable pieces. Dictation slip “I don't want to move it to Cloudflare” contradicted by the rest of the message; intent is migrate **to** Cloudflare off Fly.io.
