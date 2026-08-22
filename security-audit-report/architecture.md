# Architecture Summary

## Application Overview

**The Epic Startup** is a full-stack SaaS web application and API built using a
monorepo structure (npm workspaces, Turborepo). It includes multiple frontend
applications (`app`, `admin`, `web`, `cms`) and backend services (`tenant-api`).

## Tech Stack

- **Languages/Frameworks**: TypeScript, React, React Router (v7) / Remix.
- **Database**: SQLite (via LiteFS) with Drizzle ORM.
- **Authentication**: Custom cookie-based sessions, JWT for API/mobile,
  OAuth/OIDC for SSO.
- **Styling**: Tailwind CSS.

## Trust Model & Boundaries

- **Authentication**: Uses cookie-based sessions for web (`en_session`,
  `en_verification`) signed with a `SESSION_SECRET`. APIs use short-lived JWTs
  (Access & Refresh tokens).
- **Authorization**: Role-based access control (RBAC). Trust boundaries are
  enforced at the router/action level.
- **Data Access**: Organization-level isolation.
- **Actors**: End-users, Organization Admins, Super Admins, APIs, Mobile Apps.

## Input Surfaces

- **Web Routes**: Form submissions, URL parameters, query strings.
- **API Endpoints**: JSON payloads (REST-like), JWT headers.
- **SSO Callbacks**: OIDC integration (`code`, `state`, `id_token`).
- **File Uploads**: Profile images (S3/storage).
- **External Integrations**: Stripe, SSO providers.

## Key Entry Points

- `apps/app/app/routes/_auth+/login.tsx` (Web Login)
- `apps/app/app/routes/api+/auth.login.ts` (API Login)
- `apps/app/app/utils/sso/auth.server.ts` (SSO Provisioning)
