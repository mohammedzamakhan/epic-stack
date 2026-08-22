# Findings Detail

## Account Takeover via SSO Email Claim Trust

**Severity**: CRITICAL

### Description

The SSO authentication service provisions or links users based solely on the
`email` claim returned by the Identity Provider (IdP). An attacker who can
configure an OIDC provider for an organization they control (or using any
permissive OIDC provider if they can bypass organization restrictions) can set
their `email` claim to match a victim's email (e.g., an administrator). When
logging in via SSO, `provisionUser` links the SSO session to the victim's
existing account. The only defense is `allowedEmailDomains`, which is
configurable per-organization. However, the system allows the attacker to log in
to the victim's account because it does not cryptographically or
administratively verify that the SSO provider is authoritative for the victim's
email domain before linking the identity.

### Data Flow

1. **Entrypoint:**
   `apps/app/app/routes/_auth+/auth.sso.$organizationSlug.callback.ts:154` -
   Attacker initiates an SSO callback with a forged ID token containing the
   victim's email.
2. **Propagation:** `apps/app/app/utils/sso/auth.server.ts:637` - The SSO
   service (`handleUserInfo`) extracts the email claim from the token and passes
   it to `provisionUser`.
3. **Sink:** `apps/app/app/utils/sso/auth.server.ts:230` - `provisionUser` finds
   the existing user by email and links the new SSO identity (or updates the
   user and returns the identity), returning the victim's account to be logged
   in.

### Execution Payload

- **Attacker**: An authenticated user who can create/configure an organization
  and set up its SSO, or any user targeting a permissive SSO configuration.
- **Request**: Initiate the SSO login flow. Have the attacker-controlled OIDC
  server return an ID token with the victim's email (e.g.,
  `admin@epic-startup.com`).
- **Result**: The application links the SSO login to the victim's account and
  provisions a session for the attacker as the victim, granting full access.

### Baseline Comparison

Mainstream applications (like Auth0 or Vercel) that support custom SSO
integrations require explicit Domain Verification (e.g., setting a DNS TXT
record) before an organization is allowed to claim or provision users for a
specific domain. Without this, they require users to explicitly consent to
linking their account.

### Remediation Strategy

Require explicit confirmation or domain verification before linking a new SSO
identity to an existing account. In `apps/app/app/utils/sso/auth.server.ts`, if
an existing user is found during provisioning, verify that the SSO provider is
authoritative for that domain or send a verification email to the user before
completing the link.
