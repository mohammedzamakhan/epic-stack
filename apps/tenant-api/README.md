# Tenant API

Regional Hono service for **customer** phone OTP and per-org SQLite. One process
per `DATA_REGION` (`us` or `ksa`). App and Admin never store customer PII here;
they only POST `{ orgId, slug, dataRegion }` to provision or wipe a database.

| Local process                 | Port | Region |
| ----------------------------- | ---- | ------ |
| `npm run dev` (via `dev:all`) | 3007 | `us`   |
| `npm run dev:tenant-api:ksa`  | 3009 | `ksa`  |

Browsers on tenant Sites call this API **directly**. Do not proxy auth through
`apps/sites`.

## Production

- US: `apps/tenant-api/fly.toml` (`epic-startup-tenant-us`, region `sjc`)
- KSA: `apps/tenant-api/fly.ksa.toml` (`epic-startup-tenant-ksa`, region `jed`)
- Image: `apps/tenant-api/Dockerfile`
- CI deploys both apps from `.github/workflows/deploy.yml` when `tenant-api` is
  affected. Consul keys must stay different (`LITEFS_CONSUL_KEY` in each
  `fly.toml`).

Set `APP_URL` to the US App. Regional nodes resolve published orgs from that API
when they do not share the control-plane Prisma volume.

Canonical guide:
[docs/tenant-data-residency.md](../../docs/tenant-data-residency.md). ADR:
[docs/decisions/045-tenant-data-residency.md](../../docs/decisions/045-tenant-data-residency.md).
