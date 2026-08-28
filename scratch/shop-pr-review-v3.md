# Re-Evaluation — Stripe Connect / Polar / Checkout.com Shop PR (Round 3)

**Scope of review:** the 12 uncommitted edits, the new file
`apps/app/app/utils/tenant-customer-auth.server.ts` from round 2, plus 50+
new/modified files for round 3 (the user described it as "added polar and
checkout.com" but the actual diff is a major architectural rewrite — 57 files,
+22k lines — that introduces a `packages/payments/src/shop/` module abstracting
three payment processors behind a single `ShopCommerce` class).

**Method:** read every new file in the shop module, the new connect adapters,
the new webhook route, the new schema, the env schema, the settings UI, and the
Sites surfaces. Then launched two parallel verification sub-agents
(security/correctness and architecture/quality) and cross-checked their claims
against the source.

**Headline:** the refactor is a big improvement — clean
`ShopProcessorDefinition` catalog, client-safe/server split, processor-agnostic
snapshot type, unified webhook event model, and a working three-provider
onboarding flow. **All round 1 and round 2 fixes are intact** (verified
explicitly). But the rewrite introduces **one new high-severity bug**
(Checkout.com success page gets no params and never displays the order), **one
real money-correctness concern** (Checkout.com `amount_allocations` shape
unverified end-to-end), **one operational footgun** (Polar embed CSP is
unconditional for every site regardless of org's processor), and several smaller
correctness, defense-in-depth, and taste issues.

---

## 1. Round 1 + 2 fixes — still in place

I explicitly verified every blocker from prior reviews:

- **§1.1 (round 1) public-endpoint auth** — `resolveVerifiedShopCustomer` still
  wired in `shop.server.ts:450-454` and `532-536`. The
  `tenant-customer-auth.server.ts` module still verifies the JWT
  (`payload.type === 'access'`, `payload.orgId === organizationId`). **Confirmed
  in place.**
- **§1.3 (round 1) Connect onboarding race** — `startConnectOnboarding` still
  uses the conditional update with `isNull` predicate (`shop.server.ts:251-265`)
  plus the per-org rate limit. **Confirmed in place.**
- **§1.4 (round 1) webhook idempotency** — `upsertShopOrder`
  (`shop.server.ts:945-1058`) now handles six processor-specific unique indexes
  via `onConflictDoUpdate`. The migration 0001 added unique indexes; migration
  0002 added Polar indexes; migration 0003 added Checkout.com indexes. All
  idempotent. **Confirmed in place.**
- **§2.1 (round 1) card "last writer wins"** — `recordCustomerPaymentMethod` at
  `shop.server.ts:891-913` pre-selects the existing row, compares `customerId`,
  and refuses to re-attribute. **Confirmed in place.**
- **§2.4 (round 1) profile.astro XSS** — `profile.astro` still uses
  `createElement` + `textContent`. **Confirmed in place.**

**The rewrite did not regress any prior fix.** This is a real win — a 22k-line
refactor usually introduces at least one regression.

---

## 2. New BLOCKING / HIGH severity

### 2.1 [BLOCKING — UX / order display] Checkout.com success page never displays the order

**Files:** `apps/app/app/utils/shop.server.ts:483-488`,
`apps/sites/src/pages/shop/success.astro:10-15`,
`apps/app/app/routes/resources+/sites.shop.order.ts:17-21`

For Stripe and Polar, the success URL is built with a template substitution so
the redirect includes the order id:

- Stripe: `${siteBase}/shop/success?session_id={CHECKOUT_SESSION_ID}`
- Polar: `${siteBase}/shop/success?checkout_id={CHECKOUT_ID}`

For **Checkout.com**, the success URL is `${siteBase}/shop/success` — a bare URL
with no query params. The success page at `shop/success.astro:10-15` only
displays the order if at least one of `session_id` / `payment_intent` /
`cko-payment-id` / `checkout_id` is in the query string. For a Checkout.com
customer, **all four are absent**, so `fetchShopOrderStatus` is never called,
and the page shows a generic "Order confirmed" toast with no order details.

**The customer cannot tell whether their payment was actually captured or
whether they should contact support.** This is a real bug, not a cosmetic issue.

**Fix options:**

- Configure Checkout.com's `success_url` to include the payment id (e.g.,
  `${siteBase}/shop/success?cko-payment-id={PAYMENT_ID}` if Checkout.com
  supports that template), OR
- For Checkout.com, have the success page use the verified JWT to look up the
  most recent order for that customer (since they're logged in), OR
- Use a `pending` confirmation page + a server-side status check via cookie.

### 2.2 [BLOCKING — money correctness] Checkout.com `amount_allocations` shape not verified end-to-end

**File:** `packages/payments/src/connect/checkout-shop.ts:166-174`

```ts
amount_allocations: [
  {
    id: options.subEntityId,
    amount: orgPayoutCents + platformFeeCents,
    commission: { amount: platformFeeCents },
  },
],
```

This is the right intent: the sub-entity receives the full gross, and the
platform takes a commission from that. But the Checkout.com Platforms API has
revised its `amount_allocations` schema over time, and without a live `$1` test
payment, I cannot confirm whether the `amount` field means "gross allocated to
sub-entity" or "sub-entity's net." If the semantics are inverted, the platform
either **double-collects** (charges the customer once, but the platform and
sub-entity each think they got the full amount) or **zero-payouts the
sub-entity** (the customer pays, the sub-entity gets nothing because the
platform took the full gross as commission).

**Must verify with a live test before going to production.** This is a 5-minute
Stripe/Polar/Checkout.com sandbox test, not a code change.

### 2.3 [HIGH — defense in depth] Polar embed CSP is unconditional for every site

**File:** `apps/sites/src/middleware.ts:60-64`

```ts
const shopCheckoutCsp = {
	inlineCard: inlineShopCheckoutEnabled,
	hostedEmbed: true, // <-- always true
}
```

`shopCheckoutCsp` is merged into the `connect-src`, `script-src`, and
`frame-src` directives of every site response. With `hostedEmbed: true`, the CSP
allows `cdn.jsdelivr.net` (script-src), `api.polar.sh` / `sandbox-api.polar.sh`
(connect-src), and `polar.sh` / `sandbox.polar.sh` (frame-src) on every page of
every published site, regardless of whether the org uses Polar.

The blast radius is small (Polar is a legitimate processor, not an attacker),
but it's a real defense-in-depth gap:

- A `connect-src` that includes `api.polar.sh` means the browser can send fetch
  requests to Polar. The site is the client, not the server, so an XSS in the
  page could exfiltrate data to Polar.
- A `frame-src` that includes `polar.sh` means Polar can be framed by the site,
  and vice versa.

**Fix:** the middleware already fetches the org on every non-static request
(`middleware.ts:187-190`). Thread the org's `shopPaymentProvider` into
`securityHeadersFor` and only include Polar's CSP origins when
`provider === 'mor'`. Same fix for the inline-card Stripe CSP — only include
`js.stripe.com` and `api.stripe.com` when `processor === 'connect'`.

### 2.4 [HIGH — order duplication] Stripe `checkout.session.completed` + `payment_intent.succeeded` create two `shop_orders` rows

**Files:** `packages/payments/src/shop/commerce.ts:556-558`, `:672-723`,
`apps/app/app/routes/api+/stripe+/webhook.tsx:102-112`,
`apps/app/app/utils/shop.server.ts:616-660`

`retrieveConnectCheckoutSession` (line 556-558) does NOT pass
`expand: ['payment_intent']` to Stripe. So when a Stripe Checkout session is
recorded from `checkout.session.completed`:

1. `mapConnectCheckoutSessionToOrder` (line 672-699) extracts
   `processorPaymentId = session.payment_intent?.id || null` — usually null
   because the PI isn't expanded.
2. `upsertShopOrder` (line 945-1058) inserts a row with
   `stripeCheckoutSessionId = session.id` and `stripePaymentIntentId = null`.
3. Then the `payment_intent.succeeded` webhook fires for the same purchase.
4. `mapConnectPaymentIntentToOrder` (line 701-723) creates an order with
   `stripeCheckoutSessionId = null` and
   `stripePaymentIntentId = paymentIntent.id`.
5. `upsertShopOrder` tries the `stripeCheckoutSessionId` branch (line 986-996) —
   value is null, skipped. Tries the `stripePaymentIntentId` branch (line
   998-1008) — value is set, inserts a NEW row.
6. **Two `shop_orders` rows exist for one customer purchase.**

This is a real data integrity bug. The fix is one of:

- Pass `expand: ['payment_intent']` at line 558 so the session-level recording
  already has the PI id, and make the PI-level handler a no-op when a session
  row exists. OR
- Drop the PI-level recording path entirely (the session handler will record
  when the payment completes). OR
- Make `recordShopOrderFromConnectWebhook` always record via the session, even
  from a `payment_intent.succeeded` event (look up the session by
  `paymentIntent.checkout_session`).

The cleanest fix is the first: expand `payment_intent` on the session retrieve.
The round-1 unique-index design assumed this would always be available; the
round-3 refactor accidentally regressed it.

### 2.5 [HIGH — money reporting] "You receive 80% after the platform fee" over-promises for MoR and Checkout.com

**File:**
`apps/app/app/components/settings/cards/organization/shop-card.tsx:61, 292-296`

```ts
const orgSharePercent = 100 - SHOP_PLATFORM_FEE_PERCENT  // 80
// ...
<p>Customers pay this amount. You receive {orgSharePercent}% after the platform fee.</p>
```

For Stripe Connect, this is roughly true (Stripe Connect destination charges pay
the connected account 80% gross, then Stripe Connect deducts payment processing
fees on top). For Polar (Merchant of Record) and Checkout.com sub-entities, this
is materially misleading: the operator's actual take-home is the 80% gross MINUS
payment processing fees (~2.9% + 30¢ for cards) and, for Polar, MINUS tax
remittance fees (Polar's MoR fees are typically 4-8% + $0.40).

The current text would lead an operator to expect $80 net on a $100 sale, when
they'll actually receive ~$72-$76. For a marketplace this is a trust problem;
for a real business, it's a financial projection error.

**Fix:** add a footnote distinguishing the three processors: "Stripe Connect:
80% of gross, minus Stripe payment processing fees. Polar (MoR): 80% of gross,
minus Polar's MoR fees (processing + tax remittance). Checkout.com sub-entity:
80% of gross, minus Checkout.com payment processing fees and the platform
commission."

Or — at minimum — say "80% of gross" and link to a per-processor fee breakdown.

---

## 3. New MEDIUM severity

### 3.1 [MEDIUM — replay] Checkout.com webhook uses body-only HMAC, no timestamp validation

**File:** `packages/payments/src/connect/checkout-shop.ts:260-275`

```ts
const digest = createHmac('sha256', secret).update(payload).digest('hex')
const received = signature.trim()
if (!received || digest.length !== received.length) {
	throw new Error('Checkout.com webhook signature verification failed')
}
if (!timingSafeEqual(Buffer.from(digest), Buffer.from(received))) {
	throw new Error('Checkout.com webhook signature verification failed')
}
```

This is the legacy Checkout.com `cko-signature` scheme (body-only HMAC). It has
no timestamp, no nonce, no replay window. **A leaked `CHECKOUT_WEBHOOK_SECRET`
allows unbounded replay forgery of any captured webhook payload**, indefinitely.
The order write is idempotent (unique indexes) so the practical impact is
limited to: (a) log noise, (b) any future business logic triggered by
`payment_approved` events, (c) the side effect of the
`syncCustomerPaymentMethodFromIntent` (only fires for Stripe, not Checkout.com,
so this is moot for Checkout.com).

**Recommendation:** Checkout.com also supports the Standard Webhooks format
(`svix`-style with `webhook-id`/`webhook-timestamp`/`webhook-signature` headers
and a `whsec_*` secret). The `standardwebhooks` package is already installed
(via `@polar-sh/sdk/webhooks`). Switch to that, and you get 5-minute timestamp
tolerance built-in.

### 3.2 [MEDIUM — misroute] Polar webhook missing-headers path returns 500 instead of 400

**File:** `apps/app/app/routes/api+/shop+/webhook.tsx:67-76`

```ts
const status =
	error instanceof Error && error.message.includes('signature') ? 400 : 500
```

The `standardwebhooks` library throws
`WebhookVerificationError("Missing required headers")` (verified in
`node_modules/standardwebhooks/dist/index.js:39`) when `webhook-id` /
`webhook-timestamp` is missing. That message does **not** contain "signature",
so the error classification returns 500 (server error) instead of 400 (client
error). This causes Polar's webhook retry logic to back off exponentially on
what's actually a misconfiguration.

**Fix:** match `'headers'` in the error classification, or check
`error.name === 'WebhookVerificationError'` instead of string matching.

### 3.3 [MEDIUM — tenancy] Checkout.com invite uses operator's email, not org contact email

**File:** `apps/app/app/routes/_app+/$orgSlug_+/settings+/shop.tsx:215-258`,
`apps/app/app/utils/shop.server.ts:321-352`

The `invite-checkout-payout` intent reads `userId → UserTable.email` and passes
it as the `inviteeEmail` to Checkout.com. The operator's personal email becomes
the contact of record at Checkout.com for the org's sub-entity. For a contractor
operator (or any operator who later leaves the org), this is a real concern: the
contractor's email is on file with Checkout.com as a sub-entity contact, even
after they no longer have access to the org.

**Fix:** add a dedicated `Organization.contactEmail` column (or
`Organization.billingEmail` if it already exists), use that for sub-entity
invites, and confirm in the UI before sending.

### 3.4 [MEDIUM — UX] "Inline card" UI shows for Checkout.com, but Checkout.com has no inline flow

**File:** `packages/payments/src/shop/client-csp.ts:42-45`

```ts
if (processor === 'mor') {
	return inlineCheckoutEnabled ? 'hosted-embed' : 'redirect'
}
return inlineCheckoutEnabled ? 'inline-card' : 'redirect'
```

For `processor === 'checkout' && inlineCheckoutEnabled: true`, this returns
`'inline-card'`. But the Checkout.com flow always uses a hosted redirect —
`createCheckoutShopPaymentSession` returns a hosted URL, and there's no
`createInlineCheckoutCard` equivalent in `commerce.ts`. The `initInlineCheckout`
branch in `shop-checkout.ts:432-561` would try to mount Stripe Elements for a
Checkout.com org, which would fail.

**Fix:** return `'redirect'` unconditionally for `'checkout'`, or add a
`supportsInlineCard` check before returning `'inline-card'`.

### 3.5 [MEDIUM — money reporting] `order.updated` with `paid: false` can regress order status

**File:** `packages/payments/src/shop/commerce.ts:755-772, 831-851`

`mapHostedOrderToOrder` sets `status: order.paid ? 'paid' : 'pending'`. If Polar
sends an `order.updated` webhook with `paid: false` _after_ an `order.paid`
event (e.g., because of a refund that triggers an order state change), the order
row's status is reverted from `'paid'` to `'pending'`. The org's recent-orders
UI then shows a paid order that is actually refunded, and reports undercount
revenue.

**Fix:** subscribe to `order.refunded` (and `payment_refunded` for Checkout.com)
and only update status from a refund webhook; ignore the `paid: false`
transition in `order.updated` (treat it as "no change").

### 3.6 [MEDIUM — tenancy] `getPublicShopOrderStatus` is missing the US-region gate

**File:** `apps/app/app/utils/shop.server.ts:694-739`

`createPublicShopCheckoutSession` (line 441) and `createPublicShopPaymentIntent`
(line 515) both check `(organization.dataRegion || 'us') !== 'us'` and
throw 403. `getPublicShopOrderStatus` (line 694-739) does not. The endpoint is
public. For an org that was US-published when the order was placed but is now
KSA, the order status is still retrievable.

**Fix:** add the same region check at line 707.

### 3.7 [MEDIUM — no refund handler] Refund webhooks are silently dropped

**Files:** `packages/payments/src/connect/checkout-shop.ts:281-287` (whitelist
of 4 event types, no `payment_refunded`),
`packages/payments/src/shop/commerce.ts:835-848` (Polar handler accepts
`order.paid`, `order.updated`, `checkout.updated`; no `order.refunded`),
`apps/app/app/routes/api+/stripe+/webhook.tsx:58-123` (no `charge.refunded`
case)

The schema enum includes `'refunded'` (`tenant-db/src/schema.ts:363-367`), but
no code path ever writes it. A customer who gets a refund will see a "paid"
order indefinitely in the org dashboard and in reports. The finance team will
overcount revenue.

**Fix:** add `charge.refunded` (Stripe), `order.refunded` (Polar), and
`payment_refunded` (Checkout.com) handlers that update the order status to
`'refunded'`.

---

## 4. New LOW severity

### 4.1 [LOW — operational] `POLAR_ORGANIZATION_ID` not required in dev

`packages/payments/src/connect/polar-shop.ts:96`:
`organizationId: options.polarOrganizationId || undefined`. If
`POLAR_ORGANIZATION_ID` is unset, the Polar SDK uses the personal access token's
org. In a dev environment where a developer uses their own Polar personal access
token, products get created in **their** Polar org, not the platform's. Document
this in the deploy runbook.

### 4.2 [LOW — defense in depth] Stripe publishable key is served to anonymous browsers

`apps/app/app/routes/resources+/sites.shop/payment-intent.ts:60` returns
`publishableKey: getStripePublishableKey()`. Stripe publishable keys are not
secret by design, but the key is per-platform-Stripe-account, not per-org. This
is unchanged from rounds 1 and 2.

### 4.3 [LOW — testing] `configureShopCommerceForTests` is exported but unused

`shop.server.ts:51-55` defines a `configureShopCommerceForTests` that mutates
the module-level singleton. Verified via grep: no test file uses it. Either add
tests that exercise it, or remove it.

### 4.4 [LOW — testing] Test coverage gaps

- No tests for `verifyCheckoutWebhookEvent` tamper/replay/missing-header cases.
- No tests for `upsertShopOrder` on the new `polarCheckoutId` / `polarOrderId` /
  `checkoutSessionId` / `checkoutPaymentId` unique indexes.
- No tests for `recordShopOrder` rejecting unknown org ids.
- No tests for `redactSecret` on stack traces.

### 4.5 [LOW — operational] Polar embed CSP scope + redundant `getProcessorDashboardUrl`

See §2.3. Also `commerce.ts:188-200` has `getHostedDashboardUrl` as a one-line
delegate to `getProcessorDashboardUrl` — pure delegation adds nothing.

### 4.6 [LOW — config] Migration split violates the user's stated taste

**Files:** `packages/database/drizzle/0005_organization_polar_shop.sql`,
`packages/database/drizzle/0006_organization_checkout_shop.sql`,
`packages/tenant-db/drizzle/0002_shop_polar_orders.sql`,
`packages/tenant-db/drizzle/0003_shop_checkout_orders.sql`

The user's taste is explicit: "Prefers to consolidate related database
migrations into a single migration file per PR when changes ship together (e.g.,
collapse 0001/0002/0003 shop/payments/stripe-customer migrations into one)
rather than splitting them across multiple files." Round 1 correctly shipped one
consolidated `0004_organization_shop.sql` with 7 statements. Round 3 ships four
separate files for what is conceptually one change (extending the shop to
support multiple processors). These should have been:

- `0005_organization_multi_provider_shop.sql` (4 statements:
  `shopPaymentProvider`, `polarProductId`, `checkoutSubEntityId`,
  `checkoutChargesEnabled`, `checkoutPayoutsEnabled`)
- `0002_shop_multi_provider_orders.sql` (8 statements: `payment_provider`,
  `polar_checkout_id`, `polar_order_id`, `checkout_session_id`,
  `checkout_payment_id`, 4 unique indexes)

### 4.7 [LOW — duplication] Test files duplicate coverage

`apps/app/app/utils/shop.types.test.ts:35-71` and
`packages/payments/src/shop/processors.test.ts:30-101` both test
`normalizeShopProcessor` and `isShopAvailableForOrganization`. Recommend keeping
the package test as the single source of truth.

### 4.8 [LOW — design] Two-namespace model (`'connect' | 'mor' | 'checkout'` vs `'stripe' | 'polar' | 'checkout'`) lacks a guard

`processors.ts:8-9` declares the two namespaces. A future developer writing
`paymentProvider === 'connect'` in DB code (where the column stores `'stripe'`)
would compile and silently always be false. The mapping is tested but not
**documented as a cross-namespace invariant**. Add a top-of-file comment or a
runtime invariant test.

### 4.9 [LOW — code quality] `ShopCommerce` is a wide facade

`commerce.ts:148-856` is 708 lines with ~40 members. The provider
implementations are correctly in separate files
(`connect/{stripe-connect,polar-shop,checkout-shop}.ts`), but the orchestrator
centralizes 5 `mapXxxToOrder` converters, 4 `redactSecret`/key-validation
helpers, and 20+ `processor === 'connect' / 'mor' / 'checkout'` discriminators.
A strategy pattern (`Map<ShopProcessorId, ShopProcessorAdapter>`) would shrink
the class and eliminate the discriminators. This is a follow-up, not a blocker.

### 4.10 [LOW — naming] `commerce.ts:188-200` `getProcessorDashboardUrl` returns `null` for `connect`

The function returns a URL for `mor` and `checkout` but `null` for `connect`
(which uses per-account login links). The return type is `string | null`, but
the asymmetry is surprising. Consider splitting into
`getPlatformProcessorDashboardUrl(processor)` (returns `string | null` for
`mor`/`checkout`) and `getConnectDashboardLink(accountId)` (returns a
Promise<string>).

### 4.11 [LOW — code quality] `commerce.ts:858-884` `parseHostedCheckoutPayload` accepts `amount === 0`

The fallback chain `checkout.netAmount || checkout.amount || 0` returns 0 if
both are missing. A $0 order would be recorded. Recommend
`if (amountCents === 0) return null`.

### 4.12 [LOW — code quality] `commerce.ts:108-114` `mapPaymentIntentStatus` treats `requires_payment_method` as pending

```ts
if (status === 'succeeded') return 'paid'
if (status === 'canceled') return 'failed'
return 'pending' // catches 'requires_payment_method', 'processing', 'requires_action'
```

`requires_payment_method` is a _failure_ state (the customer's card was rejected
before processing). Recommend mapping it to `'failed'`.

### 4.13 [LOW — UX] Operator-toggle MoR radio re-saves product but toast says "Shop updated"

`shop.tsx:350-367` calls `syncHostedShopProduct` after the product save when the
operator toggles to MoR. The toast at line 369-373 says only "Shop updated" —
doesn't surface that the Polar product was created/synced. Minor UX.

---

## 5. Things that are correct (positive findings)

The refactor got the hard parts right:

- **Clean `ShopProcessorDefinition` catalog** (`processors.ts:8-45`) with
  capability flags and O(1) lookup maps.
- **Client/server split** (`client.ts` vs `index.ts`) — `client.ts` does not
  re-export server-only code (Stripe/Polar/Checkout SDKs). Verified by reading
  the import list.
- **Provider-agnostic `ShopOrganizationSnapshot` type** (`types.ts:15-29`) uses
  generic field names (`connectAccountId`, `hostedProductId`,
  `checkoutSubEntityId`), with `mapOrganizationToShopSnapshot` as the single
  bridge to the DB columns.
- **Idempotent webhook recording** — the unique-index design from round 1
  extends cleanly to three providers via 6 columns and 6 indexes.
  `upsertShopOrder` cascades through them in a deterministic order.
- **Per-provider webhook verification** — Polar uses `validateEvent` from
  `@polar-sh/sdk/webhooks` (Standard Webhooks, correct), Stripe uses
  `stripe.webhooks.constructEvent` (correct), Checkout.com uses raw HMAC
  (legacy, see §3.1 for the improvement).
- **Processor-agnostic fee math** — `calculateShopFees` and
  `SHOP_PLATFORM_FEE_PERCENT` are centralized in `shop-fees.ts`; the duplicate
  in the old `shop.types.ts` is gone.
- **Defense in depth on secrets** — `withConnect` / `withHosted` /
  `withCheckoutCommerce` wrappers in `commerce.ts:276-310` strip secrets from
  error messages before rethrowing. Not perfect (stack traces aren't redacted,
  see §4.x), but the message is.
- **Region guard preserved at every shop entry point** — Connect onboarding,
  Connect PI, hosted checkout, hosted product sync, all gate on
  `dataRegion === 'us'`. The only gap is `getPublicShopOrderStatus` (§3.6).
- **Per-processor rate limit** — `SHOP_CONNECT_ONBOARDING_RATE_LIMIT` still in
  place for the connect onboarding path.
- **Auth via verified JWT** — `resolveVerifiedShopCustomer` still wired into
  both `createPublicShopCheckoutSession` and `createPublicShopPaymentIntent`
  (and the new checkout-shop and polar paths).
- **Embed flag is correctly Polar-only** — `embedOrigin` is only used by
  `createPolarShopCheckout`. Stripe and Checkout.com paths ignore it. Verified.
- **Saved payment methods are correctly Stripe-only** —
  `loadSavedPaymentMethods` is only called from the inline-card path, and the UI
  host for the saved methods is only rendered when `useInlineCard === true`.
  Polar/Checkout.com don't pollute the UI with irrelevant Stripe methods.
- **Type discipline** — the `processor === 'connect' / 'mor' / 'checkout'`
  discrimination happens at one place per category (catalog, snapshot mapping,
  commerce methods). The `processorCheckoutId` / `processorPaymentId` /
  `processorOrderId` triplet on `ShopOrderUpsert` is converted to the right DB
  column by the recorder.
- **Migrations remain backward-compatible** — all new columns are nullable; new
  unique indexes on null columns are skipped by SQLite.

---

## 6. Things the sub-agents got wrong (corrections)

- **ARCH3-12 (partial)**: One agent claimed there's a comment in
  `inviteCheckoutSubEntityOnboarding` that says it uses the org email. There is
  **no such comment**. The code is self-consistent; the operator's email is
  what's used. The real concern (§3.3) is that the design itself is risky, not
  that it contradicts documentation.
- **ARCH3-7**: One agent claimed `processor` is missing from the Sites API
  response. It **is** present (`pages/api/shop/checkout.ts:47`). The Sites
  `shop-checkout.ts` doesn't read it (relying on `data-checkout-ui` from the
  page), but the field is sent.
- **ARCH3-2/V3-2/V3-24 (the most important)**: The first agent's brief said the
  Checkout.com signature scheme is `"{timestamp}.{body}"` (Standard Webhooks).
  This was wrong — Checkout.com's legacy `cko-signature` scheme is body-only
  HMAC. The code matches the legacy scheme. The concern is that the legacy
  scheme has no replay protection (§3.1), not that the algorithm is wrong.
- **NEW-10 (the first agent)** was correct in substance: the Checkout.com
  signature scheme needs to be verified against the live dashboard config. If
  the platform is configured for Standard Webhooks (likely on a current
  Checkout.com account), the verification will always fail.

---

## 7. Recommended fix order (post-merge)

These can land in this order without compounding risk:

1. **(§2.4)** Stripe `retrieveConnectCheckoutSession` — add
   `expand: ['payment_intent']`. This is the highest-impact single-line fix (one
   customer purchase → one DB row, not two).
2. **(§2.1)** Checkout.com success page — pick one of the three options in §2.1.
   The "use the verified JWT to look up the most recent order" option is the
   cleanest if the customer is logged in.
3. **(§2.3)** CSP scoping per processor — `middleware.ts:60-64` reads the org on
   every non-static request; thread the processor into the CSP.
4. **(§2.2)** Verify Checkout.com `amount_allocations` end-to-end with a $1
   test. This is operational, not a code change.
5. **(§3.6)** Add the US region check to `getPublicShopOrderStatus`.
6. **(§3.1)** Switch Checkout.com webhook verification to Standard Webhooks (the
   `standardwebhooks` package is already installed).
7. **(§3.3, §3.4, §3.5, §3.7, §4.x)** Smaller follow-ups.

The rest (§4 LOWs) is good follow-up material. The migration-split taste
violation (§4.6) is the kind of thing to address with the next migration PR.

---

## 8. TL;DR — what's blocking, what's solid

**Blocking (must fix before production for Checkout.com customers):**

- §2.1 Checkout.com success page never displays the order
- §2.2 `amount_allocations` shape unverified end-to-end
- §2.4 Stripe session + PI webhooks create duplicate orders (regression of
  round-1 idempotency)

**Solid:**

- Round 1 + 2 fixes all intact
- The `ShopProcessorDefinition` catalog is a clean abstraction
- The provider-agnostic snapshot type is well-designed
- Idempotent webhook recording scales cleanly to 3 providers
- The fee math is centralized (the round-1 finding is finally closed)
- Region guards, JWT auth, per-org rate limits all in place

**Recommended follow-up:**

- §2.3 Polar embed CSP scope (defense in depth)
- §2.5 "80% after platform fee" copy accuracy
- §3.1 Checkout.com webhook replay window
- §3.3 Checkout.com invite email source
- §4.6 Migration consolidation (taste violation)

The architecture is in much better shape than rounds 1 and 2. The remaining work
is correctness (a handful of bugs) and defense-in-depth (a few operational
footguns), not architecture. Ship the fixes in §2.1, §2.2, and §2.4, then this
is ready to roll out to Checkout.com customers. The Stripe Connect and Polar
paths are solid.
