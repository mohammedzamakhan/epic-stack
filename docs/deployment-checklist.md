# Deployment Checklist

This document outlines the steps for deploying the Epic Stack using its
Cloudflare-based architecture.

## Overview

- **Main App & Admin App**: Cloudflare Workers with Cloudflare D1
- **Marketing Site & Tenant Sites**: Cloudflare Pages
- **CMS**: Vercel (using Turso + R2 S3)
- **Tenant-API**: OCI Ampere VMs with per-org SQLite
- **Jobs Cron**: Cloudflare Workers

## Prerequisites

- [ ] Node.js 22.15.0+ and npm 10.9.0+ installed
- [ ] Cloudflare Account with Workers, Pages, D1, and R2 enabled
- [ ] Wrangler CLI installed and authenticated (`npx wrangler login`)
- [ ] OCI (Oracle Cloud) account for tenant-api
- [ ] Vercel account for CMS

## Step 1: Create Cloudflare D1 Databases

- [ ] Create the control plane database for production and staging
  ```bash
  npx wrangler d1 create epic-startup-db
  npx wrangler d1 create epic-startup-staging-db
  ```
- [ ] Update `wrangler.jsonc` files with the generated database IDs.

## Step 2: Set Environment Secrets

Use `wrangler secret put` to configure necessary secrets for your workers (e.g.,
`SESSION_SECRET`, `INTERNAL_COMMAND_TOKEN`).

```bash
npx wrangler secret put SESSION_SECRET
```

## Step 3: Deploy Cloudflare Workers & Pages

Deploy the App and Admin using Wrangler:

```bash
npm run build
cd apps/app && npx wrangler deploy
cd ../admin && npx wrangler deploy
```

Deploy the Marketing and Tenant Sites to Cloudflare Pages:

```bash
cd apps/web && npx wrangler pages deploy ./dist
cd ../sites && npx wrangler pages deploy ./dist
```

## Step 4: Deploy Tenant-API (OCI)

- [ ] Build the `linux/arm64` image for tenant-api.
- [ ] Push to GHCR or your preferred registry.
- [ ] SSH into your OCI VMs in Riyadh/Ashburn and pull/run the image mapping the
      `/data/tenants` volume.

## Step 5: Test & Verify

- [ ] Ensure all health checks return 200 OK.
- [ ] Verify D1 migrations have run successfully.
- [ ] Check Cloudflare Workers logs using `npx wrangler tail`.

## Troubleshooting

- **Database Errors**: Verify D1 binding IDs match your `wrangler.jsonc`.
- **Tenant-API Issues**: Check OCI block volume permissions and `DATA_REGION`
  environment variables.
