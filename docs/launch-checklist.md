# Launch Checklist

Use this checklist when rolling out Epic Startup in phases: closed beta
(waitlist), public beta, and full launch. It covers product behavior controlled
by `LAUNCH_STATUS`, waitlist setup, and Discord verification.

For infrastructure (D1, Workers, tenant-api, Pages), use the
[Deployment Checklist](./deployment-checklist.md) first.

## Launch phases

`LAUNCH_STATUS` is an enum on **both** `apps/app` and `apps/admin`. The two apps
must use the **same value** in every environment.

| Phase       | Value         | What users see                                                                          | Billing |
| ----------- | ------------- | --------------------------------------------------------------------------------------- | ------- |
| Closed beta | `CLOSED_BETA` | Sign up → `/waitlist`; earn points via referrals and Discord; admins grant early access | Hidden  |
| Public beta | `PUBLIC_BETA` | Sign up → create an organization; full app without Stripe checkout                      | Hidden  |
| Launched    | `LAUNCHED`    | Full product including subscriptions and billing                                        | Enabled |

Defined in `apps/app/.env.schema` and `apps/admin/.env.schema`.

### What each phase gates in code

- **Closed beta:** onboarding redirects to `/waitlist`; logged-in users without
  early access stay on the waitlist; organization creation is blocked until an
  admin grants access (`Admin → Waitlist → Grant access`).
- **Public beta:** new users go to organization creation; billing pages and
  upgrade UI are hidden.
- **Launched:** billing, Stripe plans, and the upgrade sidebar card are
  available.

---

## Shared steps (every phase change)

- [ ] Set `LAUNCH_STATUS` in `apps/app/.env` (local) or App Worker secrets
      (production/staging)
- [ ] Set the **same** `LAUNCH_STATUS` in `apps/admin/.env` or Admin Worker
      secrets
- [ ] Restart the dev server or redeploy **both** App and Admin
- [ ] Confirm Admin **Waitlist** shows the expected banner for the current phase
- [ ] Run a quick signup smoke test in the target environment

Production secrets use `wrangler secret put` — see [Secrets](./secrets.md).

```bash
# Example (run from apps/app and apps/admin)
npx wrangler secret put LAUNCH_STATUS --env production
# Enter: CLOSED_BETA | PUBLIC_BETA | LAUNCHED
```

---

## Phase 1 — Closed beta (waitlist)

### Required configuration

**App** (`apps/app/.env` or Worker secrets):

- [ ] `LAUNCH_STATUS=CLOSED_BETA`
- [ ] `BASE_URL` matches the public App origin (emails, OAuth callbacks)

**Admin** (`apps/admin/.env` or Worker secrets):

- [ ] `LAUNCH_STATUS=CLOSED_BETA`

### Waitlist verification

- [ ] New signup completes onboarding and lands on `/waitlist`
- [ ] Existing users without early access are redirected to `/waitlist` from `/`
- [ ] Referral link (`/r/{code}`) awards +5 points to the referrer on signup
- [ ] Admin **Waitlist** lists entries, sort/filter works, and **Grant access**
      lets a user create an organization
- [ ] After grant, the user leaves the waitlist and can use the app normally

**Marketing site (optional):** Use the existing **Hero Section** block with
variant **Medium Impact (Centered waitlist / signup CTA)** on your public
landing page. Set **Primary CTA URL** to `/signup` (or your app signup URL). Add
a **Benefits List** block below it for the numbered “why join early” section
(eyebrow, headline, and benefit lines). No email field — account signup is
required for the waitlist.

Headlines and descriptions support markdown (`**bold**`, `==highlight==`,
`^^brand color^^`). See [Marketing CMS markdown](./marketing-cms-markdown.md).

E2E coverage: `apps/app/tests/e2e/waitlist-referral.test.ts` (requires
`LAUNCH_STATUS=CLOSED_BETA`).

### Discord integration (recommended)

Automated Discord verification awards +2 points when a user joins your server
and completes OAuth. Without OAuth env vars, the waitlist page still shows the
invite link but displays a **manual verification** note instead of the verify
button.

**App** env vars (see
[Discord Integration for Waitlist](../apps/app/docs/DISCORD_INTEGRATION.md)):

- [ ] `DISCORD_INVITE_URL` — permanent invite link for “Join Discord server”
- [ ] `DISCORD_CLIENT_ID`
- [ ] `DISCORD_CLIENT_SECRET`
- [ ] `DISCORD_GUILD_ID` — your Discord server ID
- [ ] `DISCORD_REDIRECT_URI` — must **exactly** match a redirect registered in
      the
      [Discord Developer Portal](https://discord.com/developers/applications)
      (OAuth2 → Redirects)

Examples:

```bash
# Local (default dev:app port)
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/verify

# Custom local hostname
DISCORD_REDIRECT_URI=https://app.epic-startup.me:2999/auth/discord/verify

# Production
DISCORD_REDIRECT_URI=https://app.yourdomain.com/auth/discord/verify
```

Discord Developer Portal checklist:

- [ ] OAuth2 redirect URI added (same string as `DISCORD_REDIRECT_URI`)
- [ ] Client ID and Client Secret copied into App env / secrets

Verification smoke test:

- [ ] Waitlist shows **Verify Discord membership** (not the manual support note)
- [ ] Click verify → Discord OAuth → return to `/waitlist` with success toast
- [ ] Points increase by 2 and “Discord points claimed” appears

Production secrets (App only):

```bash
cd apps/app
npx wrangler secret put DISCORD_CLIENT_SECRET --env production
npx wrangler secret put DISCORD_CLIENT_ID --env production
npx wrangler secret put DISCORD_GUILD_ID --env production
npx wrangler secret put DISCORD_REDIRECT_URI --env production
npx wrangler secret put DISCORD_INVITE_URL --env production
```

---

## Phase 2 — Public beta

- [ ] `LAUNCH_STATUS=PUBLIC_BETA` on App **and** Admin
- [ ] Redeploy / restart both apps
- [ ] New signup goes to `/organizations/create` (not waitlist)
- [ ] Billing routes and upgrade prompts remain hidden
- [ ] Organization creation works without Stripe subscription

`TRIAL_DAYS` and `CREDIT_CARD_REQUIRED_FOR_TRIAL` are **ignored** during this
phase — billing is not shown regardless of those values.

---

## Phase 3 — Launched

- [ ] `LAUNCH_STATUS=LAUNCHED` on App **and** Admin
- [ ] Stripe configured (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
      webhooks) — see billing routes under `apps/app`
- [ ] Redeploy / restart both apps
- [ ] New users can subscribe / manage billing in organization settings
- [ ] Waitlist is inactive (`/waitlist` redirects to `/organizations` for users
      without early-access history)

### Trial configuration (App only)

Once billing is live, set these in `apps/app/.env` or App Worker vars/secrets
(also in `apps/app/wrangler.jsonc` for non-secret defaults):

| Variable                         | Default  | Purpose                                                                                                                             |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `TRIAL_DAYS`                     | `14`     | Length of the free trial (days)                                                                                                     |
| `CREDIT_CARD_REQUIRED_FOR_TRIAL` | `manual` | `manual` — org created first, trial counted from creation date; `stripe` — Stripe Checkout during org creation with card collection |

Checklist:

- [ ] `TRIAL_DAYS` set to your intended trial length (e.g. `14`, `30`, or `0`
      for no trial)
- [ ] `CREDIT_CARD_REQUIRED_FOR_TRIAL` chosen:
  - **`manual`** — simpler onboarding; users add billing before trial ends
  - **`stripe`** — card required at org creation; Stripe manages trial period
- [ ] Org creation flow smoke-tested (`/organizations/create`) for your chosen
      mode
- [ ] Billing page (`/{org}/settings/billing`) shows correct trial/subscription
      state

Implementation details: `@repo/payments` (`packages/payments/README.md`,
`getTrialConfig()` in `packages/payments/src/trial-config.ts`).

---

## Troubleshooting

| Symptom                               | Likely cause                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Manual Discord note on waitlist       | Missing `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, or `DISCORD_GUILD_ID` on App                 |
| Verify button appears but OAuth fails | `DISCORD_REDIRECT_URI` mismatch with Discord Developer Portal                                      |
| Waitlist inactive in Admin            | `LAUNCH_STATUS` ≠ `CLOSED_BETA` on Admin                                                           |
| User stuck on waitlist after grant    | Grant action failed or App still on `CLOSED_BETA` while user session stale — have user sign out/in |
| Signup skips waitlist in closed beta  | App `LAUNCH_STATUS` not `CLOSED_BETA` or env not reloaded                                          |

Full Discord troubleshooting:
[apps/app/docs/DISCORD_INTEGRATION.md](../apps/app/docs/DISCORD_INTEGRATION.md)

---

## Related docs

- [Deployment Checklist](./deployment-checklist.md) — Cloudflare, D1,
  tenant-api, Pages
- [Secrets](./secrets.md) — local `.env` vs `wrangler secret put`
- [Discord Integration for Waitlist](../apps/app/docs/DISCORD_INTEGRATION.md) —
  OAuth setup and technical flow
- [Payments package](../packages/payments/README.md) — trial config and provider
  setup
- [Waitlist referral E2E tests](../apps/app/tests/e2e/waitlist-referral.README.md)
