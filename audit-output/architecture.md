# Architecture Summary

## Application Type
The Epic Startup is a monorepo containing multiple applications and packages. It includes a web frontend (`apps/web`), an admin panel (`apps/admin`), a main application (`apps/app`), a content management system (`apps/cms`), and mobile applications (`apps/mobile`), among others.

## Tech Stack
- **Frontend/Backend:** React, React Router / Remix
- **Language:** TypeScript
- **Database:** Prisma ORM, MongoDB (for CMS)
- **Styling:** Tailwind CSS
- **Package Manager:** npm workspaces, TurboRepo
- **Testing:** Playwright, Vitest

## Trust Model & Access Control
- **Authentication:** Sessions and authentication seem to be handled via `remix-auth` with various strategies (e.g., Google, GitHub, OAuth2). API keys are hashed and verified via the `@repo/security` package.
- **Privilege Separation:** Users have roles, and sensitive operations are gated by `requireUserWithRole` checks.
- **Trust Boundaries:** The primary trust boundaries are HTTP endpoints exposed by the various applications (`app`, `admin`, `cms`, `web`). External URLs are fetched in certain endpoints (like image proxies) and must be validated to prevent SSRF.

## Input Surfaces
- **Network-facing:** HTTP routes defined in the React Router/Remix apps (e.g., `apps/admin/app/routes/*`). These handle query parameters, headers (like `Host` and `X-Forwarded-Host`), and request bodies.
- **File-based Input:** Image uploading and retrieval endpoints (e.g., `resources/images`).
- **External Integrations:** S3 for storage, third-party auth providers.

## Key Entry Points for Auditing
- `apps/admin/app/routes/resources+/healthcheck.tsx` (Healthcheck endpoint processing Host headers)
- `apps/admin/app/routes/resources+/images.tsx` (Image proxy and local file server)
- `packages/common/src/headers.server.ts` (Shared header parsing logic)
