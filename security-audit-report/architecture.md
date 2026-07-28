# Architecture Summary

## Application Overview
The Epic Startup is a monorepo application containing multiple interconnected services. The main components include:
- `apps/app`: A web application built using Remix/React Router 7, functioning as the core product.
- `apps/web`: A marketing site built using Astro.
- `apps/admin`: An internal admin interface.
- `apps/cms`: A content management system.
- `apps/mobile`: A React Native mobile application built with Expo Router.
- Various supporting packages (e.g., `@repo/database` using Prisma, `@repo/auth`, `@repo/observability` using Sentry, etc.).

## Tech Stack
- **Frameworks**: React Router 7 (Remix), Astro, React Native (Expo)
- **Database**: PostgreSQL (managed via Prisma)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Radix UI primitives
- **Authentication**: Custom implementation using sessions, JWTs, and OAuth providers
- **Other**: Vite for builds, Vitest for testing, Playwright for E2E.

## Trust Model & Actors
- **Anonymous Users**: Can view the marketing site and access public routes (e.g., login, signup).
- **Authenticated Users**: Can access the main application, create organizations, manage notes, and interact with other users' content based on organizational permissions.
- **Organization Admins**: Have elevated permissions within their organizations (e.g., managing members, modifying organization settings).
- **System Admins**: Have access to the `apps/admin` interface and broad access to system-wide data.

## Key Input Surfaces
1.  **HTTP Endpoints**: Remix loaders and actions handling user requests, form submissions, and API interactions.
2.  **Database**: Content stored and retrieved via Prisma, often reflecting user-generated data (e.g., notes, comments, user profiles).
3.  **File Uploads**: Media uploads handled through storage utilities.
4.  **WebSockets/External Integrations**: Third-party integrations (e.g., Stripe, Novu).
