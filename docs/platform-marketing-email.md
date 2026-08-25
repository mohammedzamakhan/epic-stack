# Platform marketing email

Admin **platform marketing** (broadcasts to tenant operators) and App
**transactional email** (password reset, invites, notifications) share one
delivery switch. App **tenant marketing** (customer PII) always sends from
regional tenant-api via OCI.

| Surface                           | Audience        | Provider switch                                |
| --------------------------------- | --------------- | ---------------------------------------------- |
| App transactional + notifications | Operators       | `EMAIL_PROVIDER` on **App**                    |
| Admin `/marketing` campaigns      | Operators       | `EMAIL_PROVIDER` on **Admin** (same OCI creds) |
| App `/marketing`                  | Customers (PII) | Always OCI on **tenant-api** (unchanged)       |

## Switching providers

Set on **App** (and **Admin** if you use platform marketing):

```bash
EMAIL_PROVIDER=oci   # default: resend

# OCI Email Delivery (same vars as tenant-api)
OCI_TENANCY_OCID=
OCI_USER_OCID=
OCI_FINGERPRINT=
OCI_PRIVATE_KEY=
OCI_REGION=us-ashburn-1
OCI_EMAIL_COMPARTMENT_ID=
OCI_EMAIL_SENDER_EMAIL=
OCI_EMAIL_SENDER_NAME=Epic Startup
OCI_EMAIL_LOG_OCID=          # required for open/click metrics on OCI
```

With `EMAIL_PROVIDER=oci`, `sendEmail()` in `@repo/email` routes to OCI
automatically. No code changes. Resend tags on platform campaigns are converted
to OCI correlation headers.

**Local dev / E2E:** with `MOCKS=true`, OCI sends are intercepted by MSW (same
fixture files as Resend via `readEmail()` in `@repo/test-utils/mocks`).

With `EMAIL_PROVIDER=resend` (default), behavior is unchanged: Resend API +
`RESEND_API_KEY`. Platform open/click tracking uses Resend webhooks on App
(`RESEND_WEBHOOK_SECRET`).

## Correlation IDs (`@repo/config/marketing-email`)

Tag and header names are derived from `brand.slug` in `packages/config/brand.ts`
so forks white-label in one place.

With the default slug `epic-startup`:

| Purpose            | Resend tag                 | OCI / SMTP header            |
| ------------------ | -------------------------- | ---------------------------- |
| Scope (`platform`) | `epic_startup_scope`       | —                            |
| Message id         | `epic_startup_message_id`  | `X-Epic-Startup-Message-Id`  |
| Campaign id        | `epic_startup_campaign_id` | `X-Epic-Startup-Campaign-Id` |
| Org id             | —                          | `X-Epic-Startup-Org-Id`      |
| Journey id         | —                          | `X-Epic-Startup-Journey-Id`  |
| Customer id        | —                          | `X-Epic-Startup-Customer-Id` |

Helpers live in `packages/config/marketing-email.ts`:

- `getMarketingEmailTags()` / `getMarketingEmailHeaders()`
- `buildPlatformMarketingResendTags()`
- `buildTenantMarketingEmailHeaders()`
- `getMarketingEmailTagValue()` / `getMarketingEmailHeaderValue()` (current +
  legacy)

**Legacy names** (`epic_scope`, `epic_message_id`, `X-Epic-Org-Id`, etc.) are
still accepted on webhook and OCI log ingest for emails sent before a slug
rename.

## Resend webhooks (when `EMAIL_PROVIDER=resend`)

Platform broadcasts tag each outbound message so webhooks can update open/click
state without mixing in transactional mail.

**Webhook endpoint:** `{BASE_URL}/api/resend/webhook` (App, not Admin)

**Resend Dashboard:** subscribe to `email.opened` and `email.clicked` → copy
signing secret to `RESEND_WEBHOOK_SECRET` on App.

## OCI engagement (when `EMAIL_PROVIDER=oci`)

Platform marketing open/click sync runs when Admin loads marketing metrics or
campaign detail (`platform-oci-engagement-sync.server.ts`). It queries OCI
Logging (`OCI_EMAIL_LOG_OCID`) and updates `PlatformMarketingMessage` by message
id header — same tables and Admin UI as Resend webhooks.

Tenant customer email engagement is unchanged: regional tenant-api +
`POST /api/marketing/sync-engagement`.

## OCI engagement (tenant marketing)

Tenant customer email is sent from **tenant-api** only (regional boundary).
Headers are set in `apps/tenant-api/src/lib/tenant-email.ts` via
`buildTenantMarketingEmailHeaders()` from `@repo/config/marketing-email`.

Engagement sync runs on marketing metrics load and hourly via jobs-cron →
`POST /api/marketing/sync-engagement` on each regional tenant-api node.

## Why split providers by default

- **Tenant PII** must send from regional OCI nodes (KSA/US residency).
- **Platform operators** live in the US control-plane DB; Resend is the default
  for low-volume operator mail.
- **`EMAIL_PROVIDER=oci`** lets you consolidate App/Admin onto OCI when ready
  without touching tenant-api.
