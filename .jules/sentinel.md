# Sentinel Journal

## 2025-02-21 - SSO Rate Limiting
**Vulnerability:** SSO endpoints (initiation and callback) lacked rate limiting, allowing potential abuse/spamming of IdP.
**Learning:** Remix loaders/actions are server-side but run outside of Express middleware chain by default. Used `checkRateLimit` utility which uses Prisma for distributed rate limiting.
**Prevention:** Always check rate limits in loaders/actions for public-facing endpoints.
