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

## Production (OCI)

App/Admin stay on Fly. Tenant-api runs on **Oracle Cloud Ampere A1** VMs:

- **US:** Ashburn `us-ashburn-1`, paid A1, `DATA_REGION=us`
- **KSA:** Riyadh `me-riyadh-1` (tenancy **home region**), Always Free A1,
  `DATA_REGION=ksa`

Use `apps/tenant-api/Dockerfile` (`linux/arm64`). Mount a block volume at
`TENANT_DB_DIR=/data/tenants`. Run `docker-compose.yml` on the VM. Set `APP_URL`
to the US App.

Canonical guide:
[docs/tenant-data-residency.md](../../docs/tenant-data-residency.md). Deploy:
[docs/deployment.md](../../docs/deployment.md#regional-tenant-data-plane). ADR:
[docs/decisions/045-tenant-data-residency.md](../../docs/decisions/045-tenant-data-residency.md).
