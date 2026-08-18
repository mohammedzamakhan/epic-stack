# Tenant API

Regional Hono service for **customer** phone OTP and per-org SQLite. One process
per `DATA_REGION` (`us` or `ksa`). App and Admin never store customer PII here;
they only POST `{ orgId }` to provision or wipe a database.

| Local process                 | Port | Region |
| ----------------------------- | ---- | ------ |
| `npm run dev` (via `dev:all`) | 3007 | `us`   |
| `npm run dev:tenant-api:ksa`  | 3009 | `ksa`  |

Browsers on tenant Sites call this API **directly**. Do not proxy auth through
`apps/sites`.

Canonical guide:
[docs/tenant-data-residency.md](../../docs/tenant-data-residency.md). ADR:
[docs/decisions/045-tenant-data-residency.md](../../docs/decisions/045-tenant-data-residency.md).
