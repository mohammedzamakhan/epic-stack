# Architecture Summary

## Application Type
Epic Startup Monorepo is a full-stack web application consisting of multiple apps and packages. It includes a web frontend (`apps/web`), an app frontend (`apps/app`), an admin dashboard (`apps/admin`), a CMS (`apps/cms`), and mobile applications (`apps/mobile`). It also includes API endpoints (`apps/tenant-api`).

## Tech Stack
- Frontend: React Router v7, React, Tailwind CSS, Base UI, Astro (`apps/web`)
- Backend: Node.js, Next.js (Payload CMS), Hono
- Database: Prisma, PostgreSQL/SQLite
- Tools: Turborepo, npm workspaces, Biome, Vitest, Playwright

## Trust Model
- Actors: End users, tenants, admins, system services.
- Trust Boundaries: HTTP API endpoints, React server functions, CMS API routes, mobile app API requests.

## Input Surfaces
1. HTTP requests (e.g. `apps/app/app/routes/api+/`, `apps/tenant-api/src/`)
2. React Server Components and Actions
3. CMS content and APIs (`apps/cms/src/app/(payload)/api/`)
