# Tenant data residency

Date: 2026-08-17

Status: accepted

## Context

Tenant Sites collect customer phone, name, and optional email. App and Admin run
in the US. KSA requires that customer PII stay in-region, including transit. A
single global tenant API hostname or a US Sites BFF that proxies auth would move
KSA PII through US servers.

HttpOnly cookies on the Sites host would send customer JWTs to US Sites on every
document request. Prisma already holds operator identity; putting customer
phone/name/email there would mix control-plane data with regional PII.

## Decision

- Store customer PII in per-org SQLite on a **regional** tenant-api node.
- Tag each org with `dataRegion` (`us` | `ksa`). The node rejects provision and
  auth unless `org.dataRegion === DATA_REGION`.
- US App provisions via `TENANT_API_URL` or `TENANT_API_URL_KSA`. It never
  writes customer PII — payloads are `{ orgId }` only.
- Changing `dataRegion` after customers exist **deletes** the old tenant
  database. PII is not migrated across regions.
- The **browser** calls the org’s regional tenant-api for login, verify,
  profile, and logout. Sites SSR may run in the US; it must not proxy PII.
- Customer tokens live in `localStorage` on the tenant origin, not in Sites
  cookies.
- Use a **separate SQLite volume** (OCI block volume) per region. Do not share
  App/Admin LiteFS with customer databases.
- Do not send KSA OTP traffic through Twilio in production.

## Rejected alternatives

- **Sites BFF (`/api/auth/*`)** — convenient HttpOnly cookies, but US Sites
  would see KSA phone/name/email and tokens.
- **Lock region after first publish** — safer against accidental wipes, but
  operators need to correct a wrong region. Wipe-with-confirm is the product
  behavior.
- **Migrate customer rows between regions** — would copy PII across borders or
  through US App.
- **One global tenant-api hostname** — DNS/geo might still land KSA traffic on a
  US node; region is an explicit org field plus per-node `DATA_REGION`.

## Consequences

Local development uses two tenant-api processes (US on 3007, KSA on 3009).
Production tenant-api runs on **Oracle Cloud**: Always Free Ampere A1 in Riyadh
(`me-riyadh-1`, tenancy home region) for `ksa`, and a paid A1 in US East Ashburn
(`us-ashburn-1`) for `us`. AWS still has no generally available Kingdom region.
Bahrain and UAE are not KSA. Customer tokens are XSS-readable on the tenant
origin. Org metadata (slug, `dataRegion`, `hasProvisionedDb`) still lives in US
Prisma; that is not customer PII.

How to operate this: [tenant data residency](../tenant-data-residency.md).
