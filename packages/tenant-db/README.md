# @repo/tenant-db

Drizzle schema and connection pool for **per-organization** customer SQLite
(`tenant_{orgId}.db`). Used only by `apps/tenant-api`.

This is not Prisma and not the App/Admin control-plane database. Customer phone,
name, and email belong here. `Organization.dataRegion` / `hasProvisionedDb` on
Prisma are flags only.

Changing an org’s data region **deletes** this file in the old region; rows are
not migrated.

See [docs/tenant-data-residency.md](../../docs/tenant-data-residency.md).
