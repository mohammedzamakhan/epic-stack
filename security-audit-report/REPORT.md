# Security Audit Report

## Executive Summary

A comprehensive security audit of the Epic Startup codebase was conducted,
focusing on authentication mechanisms, SSO provisioning, API boundaries, and
session management. While the application utilizes modern frameworks (React
Router v7, Drizzle ORM) and implements several security best practices (e.g.,
Honeypots, robust JWT usage), two notable vulnerabilities were discovered. The
most critical issue is an Account Takeover vulnerability in the SSO provisioning
flow, where identity linking relies solely on email claims without sufficient
domain verification. Additionally, a low-severity resource issue was identified
where API logins generate orphaned database session records.

## Baseline

- **Application Type**: SaaS Monorepo (Web, Admin, API).
- **Comparison**: Mainstream SaaS applications (e.g., Auth0, Vercel) that
  support custom SAML/OIDC SSO configurations enforce domain verification (e.g.,
  via DNS TXT records) before allowing SSO providers to assert identities for a
  given email domain. This prevents malicious tenants from claiming arbitrary
  emails.

## Findings Summary

| Severity | Title                                          | Description                                                                                                                                                          |
| -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL | Account Takeover via SSO Email Claim Trust     | SSO provisioning trusts the email claim from any configured OIDC provider to link to existing accounts, allowing ATO if an attacker configures a malicious provider. |
| LOW      | Orphaned Database Session Records on API Login | API logins create a DB session record but discard its ID in favor of JWTs, leading to database bloat.                                                                |

## Hardening Notes

- **Session Secrets**: The `SESSION_SECRET` environment variable is reused
  across multiple cookie storages (`auth`, `verify`, `toast`, `utm`,
  `ssoNonce`). While they use different cookie names (mitigating direct
  cross-storage injection), it is best practice to use distinct secrets or
  derive distinct keys for each storage context to adhere to the principle of
  least privilege.
- **SSO Nonce**: The OIDC nonce validation in `ssoAuthService` uses
  `?? undefined` which could lead to bypassing nonce checks if the identity
  provider omits the nonce claim. Explicit rejection is recommended when nonces
  are expected.

## Positive Patterns

- **Honeypot Implementation**: The use of honeypots on public forms effectively
  mitigates automated bot submissions.
- **Refresh Token Rotation**: The JWT refresh token logic correctly hashes
  stored tokens and implements revocation, reducing the impact of leaked
  database contents.
- **CSRF Mitigations**: The API rate limits and strict cookie options
  (`SameSite: lax`, `httpOnly: true`) are well configured.
