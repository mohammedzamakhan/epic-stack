> **Note: Payload CMS sections have been migrated to Emdash.**

# Complete Epic Stack Deployment Guide

Deploy your entire Epic Stack monorepo to production with this comprehensive
checklist-based guide.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Website       │    │   Main App      │    │   Admin App     │    │   CMS App       │
│ (Cloudflare     │    │ (Fly.io US)     │    │ (Fly.io US)     │    │ (Cloudflare     │
│  Pages)         │    │                 │    │                 │    │  Workers)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       └───────┬───────────────┘                       │
         │                               │                                       │
         └───────────────────────────────┼───────────────────────────────────────┘
                                         │
                         ┌─────────────────┐              ┌─────────────────┐
                         │ SQLite (LiteFS) │              │   D1 + R2       │
                         │ App/Admin US    │              │  (Cloudflare)   │
                         │ org data only   │              │  CMS content    │
                         └─────────────────┘              └─────────────────┘
                                         │
                    provision orgId only │
                                         ▼
              ┌──────────────────────────────────────────────────┐
              │  Tenant API + tenant SQLite  (OCI Ashburn)       │
              │  Tenant API + tenant SQLite  (OCI Riyadh)        │
              │  Browser calls tenant-api; Sites must not proxy  │
              │  customer PII                                    │
              └──────────────────────────────────────────────────┘
```

The CMS's "D1 + R2" box above is the declared target in `wrangler.jsonc`; as
shipped, Payload still uses a local SQLite file and local disk storage instead —
see [CMS storage](./cms-storage.md).

Customer phone/name/email never go in the US App/Admin database. See
[Tenant data residency](./tenant-data-residency.md).

**Applications to Deploy:**

- **Website**: Cloudflare Pages (Astro) - Already configured ✅
- **Main App**: Fly.io (`epic-startup`) - SQLite + LiteFS (US)
- **Admin App**: Fly.io (`epic-startup-admin`) - Shared SQLite (US)
- **CMS App**: Cloudflare Workers (`epic-startup-cms`). `wrangler.jsonc`
  declares D1 (SQLite) + R2 bindings, but Payload isn't wired to use either yet
  — see [CMS storage](./cms-storage.md).
- **Tenant API (US)**: OCI Ashburn (`us-ashburn-1`) — customer PII for
  `dataRegion=us`
- **Tenant API (KSA)**: OCI Riyadh (`me-riyadh-1`) — customer PII for
  `dataRegion=ksa`. Not Fly, not Bahrain, not UAE.
- **Sites**: CMS SSR; injects regional tenant-api URLs for browser auth

---

## 📋 Pre-Deployment Checklist

### Prerequisites

- [ ] **Fly.io CLI** installed and authenticated (`flyctl auth login`)
- [ ] **GitHub repository** with monorepo structure
- [ ] **Cloudflare account** with Wrangler CLI installed and authenticated
      (`npx wrangler login`), for the website, Sites, and CMS Worker
- [ ] **Node.js 22+** installed locally

### Required Accounts

- [ ] **OCI tenancy** with **home region Riyadh** (`me-riyadh-1`) and Ashburn
      subscribed
- [ ] **Fly.io account** with organization set up (App + Admin only)
- [ ] **GitHub Actions** access to repository
- [ ] **Cloudflare account** connected to the repository for Pages (website,
      Sites) and for the CMS Worker (Workers, D1, R2)

---

## 🗄️ Step 1: Database Setup

### Cloudflare D1 + R2 Setup (for CMS)

`apps/cms/wrangler.jsonc` binds a D1 (SQLite) database and an R2 bucket to the
Worker for future use, but Payload doesn't route through either binding yet (it
always uses a local SQLite file and local `public/media/` storage) — see
[CMS storage](./cms-storage.md) for what's still outstanding to actually wire
them in. Creating them now is still useful groundwork:

- [ ] **1.1** Create the D1 database
  ```bash
  cd apps/cms
  npx wrangler d1 create epic-startup-cms
  ```
  Copy the returned `database_id` into the `d1_databases` entry in
  `apps/cms/wrangler.jsonc` (it ships with the placeholder `DATABASE_ID`).
- [ ] **1.2** Create the R2 bucket for media
  ```bash
  npx wrangler r2 bucket create epic-startup-cms-media
  ```
- [ ] **1.3** Run Payload's migrations against the new D1 database as part of
      first deploy (see Step 5 for secrets and Step 9 for the deploy job that
      runs `payload migrate`).

---

## 🚀 Step 2: Create Fly.io Applications

### Create All Applications

CMS is not a Fly app — it deploys to Cloudflare Workers (see Step 1 and Step 5).
Only main and admin need Fly apps.

- [ ] **2.1** Create main app (production)
  ```bash
  flyctl apps create epic-startup --org your-org-name
  ```
- [ ] **2.2** Create main app (staging)
  ```bash
  flyctl apps create epic-startup-staging --org your-org-name
  ```
- [ ] **2.3** Create admin app (production)
  ```bash
  flyctl apps create epic-startup-admin --org your-org-name
  ```
- [ ] **2.4** Create admin app (staging)
  ```bash
  flyctl apps create epic-startup-admin-staging --org your-org-name
  ```

### Verify Applications Created

- [ ] **2.5** List all apps to verify
  ```bash
  flyctl apps list
  ```
  Should show 4 apps: main, admin (each with production + staging)

---

## 💾 Step 3: Set Up Storage

### Create Volumes for Main/Admin Apps (SQLite + LiteFS)

- [ ] **3.1** Main app production volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup
  ```
- [ ] **3.2** Main app staging volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-staging
  ```
- [ ] **3.3** Admin app production volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-admin
  ```
- [ ] **3.4** Admin app staging volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-admin-staging
  ```

### Note: CMS Doesn't Need a Fly Volume

CMS runs on Cloudflare Workers (see Step 1), so it has no Fly app and no Fly
volume regardless of whether D1/R2 are wired in.

---

## 🔗 Step 4: Configure Database Coordination

### Set Up Consul for Main/Admin Apps

- [ ] **4.1** Attach Consul to main app (production)
  ```bash
  flyctl consul attach --app epic-startup
  ```
- [ ] **4.2** Attach Consul to main app (staging)
  ```bash
  flyctl consul attach --app epic-startup-staging
  ```
- [ ] **4.3** Attach Consul to admin app (production)
  ```bash
  flyctl consul attach --app epic-startup-admin
  ```
- [ ] **4.4** Attach Consul to admin app (staging)
  ```bash
  flyctl consul attach --app epic-startup-admin-staging
  ```

### Verify Consul Setup

- [ ] **4.5** Check Consul status
  ```bash
  flyctl consul show --app epic-startup
  ```

---

## 🔐 Step 5: Configure Environment Variables

### Main App Environment Variables

#### Production Main App

- [ ] **5.1** Set main app production secrets

  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(openssl rand -hex 32)" \
    SSO_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    AUDIT_LOG_SECRET_KEY="$(openssl rand -hex 32)" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    TENANT_API_URL="https://tenant-us.example.com" \
    TENANT_API_URL_KSA="https://tenant-ksa.example.com" \
    --app epic-startup
  ```

  Save `INTERNAL_COMMAND_TOKEN` — the same value must be set on **every**
  regional tenant-api. See [tenant data residency](./tenant-data-residency.md).

#### Staging Main App

- [ ] **5.2** Set main app staging secrets
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(openssl rand -hex 32)" \
    SSO_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    AUDIT_LOG_SECRET_KEY="$(openssl rand -hex 32)" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    TENANT_API_URL="https://tenant-us-staging.example.com" \
    TENANT_API_URL_KSA="https://tenant-ksa-staging.example.com" \
    --app epic-startup-staging
  ```

### Admin App Environment Variables

#### Production Admin App

- [ ] **5.3** Set admin app production secrets (use same secrets as main app)
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(flyctl secrets list --app epic-startup | grep SESSION_SECRET | awk '{print $2}')" \
    SSO_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup | grep SSO_ENCRYPTION_KEY | awk '{print $2}')" \
    AUDIT_LOG_SECRET_KEY="$(flyctl secrets list --app epic-startup | grep AUDIT_LOG_SECRET_KEY | awk '{print $2}')" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(flyctl secrets list --app epic-startup | grep INTERNAL_COMMAND_TOKEN | awk '{print $2}')" \
    --app epic-startup-admin
  ```

#### Staging Admin App

- [ ] **5.4** Set admin app staging secrets (use same secrets as staging main
      app)
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(flyctl secrets list --app epic-startup-staging | grep SESSION_SECRET | awk '{print $2}')" \
    SSO_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup-staging | grep SSO_ENCRYPTION_KEY | awk '{print $2}')" \
    AUDIT_LOG_SECRET_KEY="$(flyctl secrets list --app epic-startup-staging | grep AUDIT_LOG_SECRET_KEY | awk '{print $2}')" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(flyctl secrets list --app epic-startup-staging | grep INTERNAL_COMMAND_TOKEN | awk '{print $2}')" \
    --app epic-startup-admin-staging
  ```

### Tenant API Environment Variables

Run on **OCI** (see
[deployment.md](./deployment.md#regional-tenant-data-plane)). One Ampere A1 VM +
block volume per region. Home region = Riyadh.

- [ ] **5.4a** Create the Riyadh Always Free A1 VM (`DATA_REGION=ksa`) with a
      volume mounted at `/data/tenants`. Copy `docker-compose.yml` to
      `/opt/tenant-api`.
- [ ] **5.4b** Create the Ashburn paid A1 VM (`DATA_REGION=us`) the same way.
- [ ] **5.4c** Set per-region `.env`: `JWT_SECRET`, `AUTH_HMAC_SECRET`,
      `INTERNAL_COMMAND_TOKEN` (same as App), `APP_URL`, `TENANT_DB_DIR`. Do not
      copy `JWT_SECRET` to Sites. Do not configure Twilio on the KSA VM.
- [ ] **5.4d** Put Cloudflare (or a Tunnel) in front of port 8080. Skip OCI load
      balancers and NAT.

### CMS (Vercel Hobby; Cloudflare Workers optional)

The Payload admin exceeds Cloudflare's free 3 MiB Worker limit. Default
production is Vercel. See [CMS storage](./cms-storage.md).

- [ ] **5.5** Create a Turso database and set Vercel project env:
      `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `PAYLOAD_SECRET`, `CRON_SECRET`,
      `PREVIEW_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `WEB_APP_URL`,
      `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
      `CLOUDFLARE_ACCOUNT_ID`.
- [ ] **5.6** Set GitHub Actions secrets for `deploy-cms`: `VERCEL_TOKEN`,
      `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- [ ] **5.6-cf** (Optional, Workers Paid) Set CMS Worker secrets and
      `vars.CMS_DEPLOY_TARGET=cloudflare` to run `deploy-cms-cloudflare`:
  ```bash
  cd apps/cms
  npx wrangler secret put PAYLOAD_SECRET
  npx wrangler secret put CRON_SECRET
  npx wrangler secret put PREVIEW_SECRET
  ```

### Jobs Cron Worker (Cloudflare)

- [ ] **5.6a** Set `APP_BASE_URL` in `apps/jobs-cron/wrangler.jsonc` for
      staging/production.
- [ ] **5.6b** Set the worker secret (must match App `INTERNAL_COMMAND_TOKEN`):
  ```bash
  cd apps/jobs-cron
  npx wrangler secret put INTERNAL_COMMAND_TOKEN
  ```
- [ ] **5.6c** (Production) Enable Cloudflare **Media Transformations** on the
      App zone and set `MEDIA_TRANSFORM_BASE_URL` on the App to the proxied
      hostname (see [scheduled jobs](./scheduled-jobs.md)).

### Verify Environment Variables

- [ ] **5.7** Check secrets are set correctly
  ```bash
  flyctl secrets list --app epic-startup
  flyctl secrets list --app epic-startup-admin
  (cd apps/cms && npx wrangler secret list)
  (cd apps/jobs-cron && npx wrangler secret list)
  ```

---

## 🔧 Step 6: Configure GitHub Actions

### Set Up GitHub Secrets

- [ ] **6.1** Get Fly.io API token
  ```bash
  flyctl auth token
  ```
- [ ] **6.2** Add GitHub repository secrets
  - Go to GitHub → Repository → Settings → Secrets and variables → Actions
  - [ ] Add `FLY_API_TOKEN` (from step 6.1)
  - [ ] Add `SENTRY_AUTH_TOKEN` (optional, for error tracking)
  - [ ] Optional repository **variables** for Sites builds: `PUBLIC_APP_URL`,
        `TENANT_API_URL`, `TENANT_API_URL_KSA`
  - [ ] Optional OCI deploy: variables `OCI_TENANT_US_HOST`,
        `OCI_TENANT_KSA_HOST`, `OCI_TENANT_SSH_USER`; secrets
        `OCI_TENANT_SSH_KEY`, `GHCR_PULL_TOKEN`

### Verify GitHub Actions Configuration

- [ ] **6.3** Check `.github/workflows/deploy.yml` includes all apps
  - [ ] `container-app` / `deploy-app` jobs exist
  - [ ] `container-admin` / `deploy-admin` jobs exist
  - [ ] `deploy-cms` job exists (Vercel; skips if `VERCEL_TOKEN` is unset)
  - [ ] `deploy-cms-cloudflare` is optional
        (`vars.CMS_DEPLOY_TARGET=cloudflare`)
  - [ ] `container-tenant-api` builds `linux/arm64` and pushes to GHCR
  - [ ] `deploy-tenant-api` SSHs to OCI VMs when `OCI_TENANT_*_HOST` is set
  - [ ] `deploy-web` and `deploy-sites` Cloudflare Pages jobs exist
  - [ ] `affected` job detects changes for app, admin, web, cms, sites, and
        tenant-api

---

## 🚢 Step 7: Deploy to Staging

### Initial Staging Deployment

- [ ] **7.1** Commit all changes
  ```bash
  git add .
  git commit -m "feat: configure deployment for all apps"
  ```
- [ ] **7.2** Push to dev branch (triggers staging deployment)
  ```bash
  git checkout dev
  git push origin dev
  ```

### Monitor Staging Deployment

- [ ] **7.3** Watch GitHub Actions workflow
  - Go to GitHub → Actions tab
  - Monitor the deployment progress
- [ ] **7.4** Check individual app logs
  ```bash
  flyctl logs --app epic-startup-staging
  flyctl logs --app epic-startup-admin-staging
  ```
  CMS has no separate staging Worker; the `deploy-cms` job redeploys it on
  pushes to `dev` or `main` that affect `apps/cms` (per the `affected` check or
  a modified path under `apps/cms/`), not on every push. Tail it with
  `npx wrangler tail` from `apps/cms`.

### Verify Staging Apps

- [ ] **7.5** Check app status
  ```bash
  flyctl status --app epic-startup-staging
  flyctl status --app epic-startup-admin-staging
  ```
- [ ] **7.6** Get staging URLs
  ```bash
  flyctl info --app epic-startup-staging
  flyctl info --app epic-startup-admin-staging
  ```

---

## 🧪 Step 8: Test Staging Environment

### Test Main App

- [ ] **8.1** Visit main app URL
- [ ] **8.2** Test user registration/login
- [ ] **8.3** Create test data
- [ ] **8.4** Verify database operations work

### Test Admin App

- [ ] **8.5** Visit admin app URL
- [ ] **8.6** Login with same credentials as main app
- [ ] **8.7** Verify shared data appears from main app
- [ ] **8.8** Create admin-specific data

### Test CMS App

CMS has one Worker environment (the `NEXT_PUBLIC_SERVER_URL` var in
`apps/cms/wrangler.jsonc`), not a separate staging app.

- [ ] **8.9** Visit CMS admin:
      `https://epic-startup-cms.<your-subdomain>.workers.dev/admin`
- [ ] **8.10** Complete CMS setup wizard
- [ ] **8.11** Create test content (posts, pages)
- [ ] **8.12** Test API endpoints:
      `https://epic-startup-cms.<your-subdomain>.workers.dev/api/posts`

### Test Database Sharing (Main/Admin)

- [ ] **8.13** Create data in main app
- [ ] **8.14** Verify data appears in admin app
- [ ] **8.15** Create data in admin app
- [ ] **8.16** Verify data appears in main app

### Test LiteFS Coordination

- [ ] **8.17** Check which app is primary
  ```bash
  flyctl ssh console --app epic-startup-staging
  curl http://localhost:20202/debug
  ```
- [ ] **8.18** Verify database replication is working

---

## 🚀 Step 9: Deploy to Production

### Production Deployment

- [ ] **9.1** Merge dev to main (triggers production deployment)
  ```bash
  git checkout main
  git merge dev
  git push origin main
  ```

### Monitor Production Deployment

- [ ] **9.2** Watch GitHub Actions workflow
- [ ] **9.3** Check production app logs
  ```bash
  flyctl logs --app epic-startup
  flyctl logs --app epic-startup-admin
  (cd apps/cms && npx wrangler tail)
  ```

### Verify Production Apps

- [ ] **9.4** Check all apps are running
  ```bash
  flyctl status --app epic-startup
  flyctl status --app epic-startup-admin
  ```
  Check CMS in the Cloudflare dashboard (Workers & Pages) or
  `npx wrangler deployments list` from `apps/cms`.
- [ ] **9.5** Get production URLs
  ```bash
  flyctl info --app epic-startup
  flyctl info --app epic-startup-admin
  ```
  CMS URL is the `NEXT_PUBLIC_SERVER_URL` value in `apps/cms/wrangler.jsonc` (or
  your custom domain).

---

## ✅ Step 10: Final Verification

### Test Production Environment

- [ ] **10.1** Test main app functionality
- [ ] **10.2** Test admin app functionality
- [ ] **10.3** Test CMS app functionality
- [ ] **10.4** Verify database sharing between main/admin
- [ ] **10.5** Test CMS API endpoints
- [ ] **10.6** Verify all apps can handle traffic

### Performance Checks

- [ ] **10.7** Check app response times
- [ ] **10.8** Monitor resource usage
  ```bash
  flyctl metrics --app epic-startup
  flyctl metrics --app epic-startup-admin
  ```
  CMS metrics (requests, CPU time, errors) are in the Cloudflare dashboard under
  Workers & Pages, not `flyctl metrics`.

### Security Verification

- [ ] **10.9** Verify HTTPS is working on all apps
- [ ] **10.10** Check that database connections are secure
- [ ] **10.11** Verify environment variables are not exposed

---

## 🔧 Step 11: Optional Configuration

### Custom Domains (Optional)

- [ ] **11.1** Add custom domain to main app
  ```bash
  flyctl certs create yourdomain.com --app epic-startup
  ```
- [ ] **11.2** Add custom domain to admin app
  ```bash
  flyctl certs create admin.yourdomain.com --app epic-startup-admin
  ```
- [ ] **11.3** Add a custom domain to the CMS Worker via the Cloudflare
      dashboard (Workers & Pages → your Worker → Settings → Domains & Routes),
      or a `routes` entry in `apps/cms/wrangler.jsonc`. `flyctl certs` does not
      apply to CMS.

### Scaling (Optional)

- [ ] **11.4** Scale main app for high availability
  ```bash
  flyctl scale count 2 --app epic-startup
  ```
- [ ] **11.5** Keep admin on a single instance (typically sufficient). CMS
      scales automatically as a Cloudflare Worker; there is nothing to
      configure.

### Monitoring Setup (Optional)

- [ ] **11.6** Set up Fly.io monitoring alerts
  ```bash
  flyctl alerts create --app epic-startup
  ```

---

## 📊 Deployment Summary

### Applications Deployed

- ✅ **Website**: Cloudflare Pages (Astro)
- ✅ **Main App**: `epic-startup` + `epic-startup-staging` (Fly.io)
- ✅ **Admin App**: `epic-startup-admin` + `epic-startup-admin-staging` (Fly.io)
- ✅ **CMS App**: `epic-startup-cms` (Cloudflare Workers, single environment)

### Database Architecture

- ✅ **Main/Admin Apps**: Shared SQLite with LiteFS replication
- ⚠️ **CMS App**: local SQLite file today (D1 binding declared but not wired in
  — see [CMS storage](./cms-storage.md))

### Deployment Pipeline

- ✅ **Staging**: Automatic deployment on push to `dev` branch (for apps
  affected by the push)
- ✅ **Production**: Automatic deployment on push to `main` branch (for apps
  affected by the push)

---

## 💰 Cost Breakdown

| Service                | Monthly Cost | Notes                                  |
| ---------------------- | ------------ | -------------------------------------- |
| **Fly.io Apps**        | $10-20       | App / Admin only                       |
| **OCI tenant-api**     | $0-20        | Free Riyadh A1 + paid Ashburn A1       |
| **Vercel (CMS)**       | $0           | Hobby plan; Turso + R2 S3              |
| **Cloudflare Workers** | $0–5         | jobs-cron free; CMS Worker needs Paid  |
| **Cloudflare D1 + R2** | $0           | Free tier; pay-as-you-go beyond limits |
| **Cloudflare Pages**   | $0           | Website + Sites, free tier             |
| **Total**              | **$10-40**   | Skip OCI LB / NAT                      |

---

## 🛠️ Troubleshooting Checklist

### If Apps Won't Start

- [ ] Check logs: `flyctl logs --app [app-name]`
- [ ] Verify environment variables are set
- [ ] Check Dockerfile builds locally
- [ ] Verify volumes are attached (main/admin apps only)

### If Database Sharing Doesn't Work

- [ ] Verify Consul is attached to both main/admin apps
- [ ] Check both apps use same Consul key in litefs.yml
- [ ] Monitor LiteFS logs for coordination issues
- [ ] Verify volumes are properly mounted

### If the CMS Vercel Deploy Won't Run

- [ ] Confirm Turso `DATABASE_URL` + `DATABASE_AUTH_TOKEN` are set on the Vercel
      project
- [ ] Confirm R2 S3 keys (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
      `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`) are set
- [ ] Confirm GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
      `VERCEL_PROJECT_ID`
- [ ] See [CMS storage](./cms-storage.md)

### If the optional CMS Worker Won't Deploy

- [ ] Free Workers is capped at 3 MiB gzip; use Workers Paid or stay on Vercel
- [ ] Verify `apps/cms/wrangler.jsonc` has a real D1 `database_id`
- [ ] Check Worker secrets: `npx wrangler secret list` (from `apps/cms`)
- [ ] Set `vars.CMS_DEPLOY_TARGET=cloudflare` for the optional CI job

### If Deployments Fail

- [ ] Check GitHub Actions logs
- [ ] Verify FLY_API_TOKEN is set in GitHub secrets
- [ ] Ensure all fly.toml files are correct
- [ ] Check Docker build context in workflows

---

## 🎉 Success!

**Congratulations!** You've successfully deployed your complete Epic Stack to
production:

- 🌐 **Website**: Fast static site on Cloudflare's global CDN
- ⚡ **Main App**: Scalable React Router app with SQLite
- 🔧 **Admin App**: Powerful admin interface sharing the same data
- 📝 **CMS**: Content management on Cloudflare Workers (local SQLite storage
  today; see [CMS storage](./cms-storage.md) for the D1/R2 wiring gap)

Your applications are now running in production with:

- ✅ Automatic deployments via GitHub Actions
- ✅ Separate staging and production environments
- ✅ Shared database between main and admin apps
- ✅ Scalable, cost-effective infrastructure
- ✅ Global CDN for fast content delivery

**Next Steps**: Monitor your applications, set up custom domains, and start
building amazing features! 🚀
