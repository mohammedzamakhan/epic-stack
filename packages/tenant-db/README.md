# @repo/tenant-db

Drizzle schema and connection pool for **per-organization** customer SQLite
(`tenant_{orgId}.db`). Used only by `apps/tenant-api`.

This is separate from the App/Admin control-plane database. Customer phone,
name, and email belong here. `Organization.dataRegion` / `hasProvisionedDb` on
the control-plane organization record are flags only.

In production, files live in `TENANT_DB_DIR` on an OCI block volume (one volume
per region). Changing an org’s data region **deletes** this file in the old
region; rows are not migrated.

See [docs/tenant-data-residency.md](../../docs/tenant-data-residency.md).
