# AGENTS.md

This file provides AI coding agents with essential context for working on the Epic Stack monorepo.

## Project Overview

**Epic Stack** is a production-ready, full-stack SaaS template built as an Nx-based monorepo with npm workspaces. It includes multiple apps (main app, marketing site, admin dashboard, mobile app, CMS, background jobs, email templates, notifications) and shared packages (UI, auth, AI, payments, storage, security, i18n, etc.).

**Tech Stack**: React 19 + React Router 7, Node.js 22, SQLite + Prisma, Tailwind CSS 4, TypeScript, Expo (mobile), Astro (marketing), deployed on Fly.io with LiteFS for distributed SQLite.

**Monorepo Structure**:
- `/apps/*` - Applications (app, web, admin, mobile, cms, etc.)
- `/packages/*` - Shared packages (ui, auth, prisma, config, ai, payments, etc.)
- `/docs/*` - Comprehensive documentation (84 markdown files)

## Setup Commands

```bash
# Initial setup (one-time)
git clone <your-fork>
cd epic-stack
cp .env.example .env
npm install && npm run setup -s

# Install Playwright browsers for E2E tests
npm run test:e2e:install
```

**Requirements**: Node.js 22.15.0, npm 10.9.0 (pinned with Volta)

## Development

```bash
# Start all apps in parallel
npm run dev

# Start specific apps
npm run dev:app        # Main React Router app (port 3001)
npm run dev:web        # Astro marketing site (port 3002)
npm run dev:mobile     # Expo mobile app

# Database management
npm run db:studio      # Prisma Studio UI (port 5555)
npm run db:migrate     # Run Prisma migrations
npm run db:seed        # Seed database with test data
npm run db:reset       # Reset database (destructive)
```

## Build & Test

```bash
# Build all packages and apps
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint           # ESLint via Nx
npm run lint:oxc       # Fast Oxlint (Rust-based)
npm run lint:all       # Both linters

# Formatting
npm run format         # Prettier with Tailwind plugin

# Unit tests (Vitest)
npm run test           # Watch mode
npm run test -- --coverage

# E2E tests (Playwright)
npm run test:e2e       # UI mode (interactive)
npm run test:e2e:run   # Headless CI mode

# Full validation (run before commits)
npm run validate       # lint + typecheck + test + e2e
```

## Code Style & Conventions

**TypeScript**:
- Strict mode enabled
- Path aliases: `#app/*` (app code), `#tests/*` (tests), `@repo/*` (packages)
- Use Zod for all validation schemas
- React Router v7 conventions (loaders/actions)

**Imports**:
- ESM modules throughout (`"type": "module"`)
- Consistent import ordering (enforced by ESLint)
- Prefer named exports over default exports

**Components**:
- PascalCase for component files and names
- Use Radix UI primitives from `@repo/ui` package
- Tailwind CSS with class-variance-authority for variants
- Use `cn()` utility for className merging

**Forms & Validation**:
- conform-to for form management
- Zod schemas for validation (client + server)
- Type-safe with TypeScript inference

**Naming**:
- Components: `PascalCase`
- Files: `kebab-case.tsx` (except components)
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Testing Guidelines

**Unit Tests**:
- Place tests alongside source files (`*.test.ts`, `*.test.tsx`)
- Use Vitest + Testing Library
- Mock external services with MSW (Mock Service Worker)
- Fixtures in `/tests/fixtures` with auto-cleanup

**E2E Tests**:
- Located in `/tests/e2e`
- Use authenticated fixtures for logged-in scenarios
- Clean up test data automatically
- 60-second timeout per test
- Must pass before merging

**Coverage**: Aim for >80% coverage on critical paths (auth, payments, security)

## Security Considerations

**Critical Requirements**:
- ALWAYS sanitize user-generated HTML with DOMPurify before rendering
- ALWAYS validate environment variables on app startup (`SESSION_SECRET`, encryption keys)
- NEVER reduce bcrypt cost factor below 12
- ALWAYS escape user input in activity logs and system messages
- ALWAYS use Zod validation for all user inputs

**Security Features in Place**:
- AES-256-GCM encryption for sensitive data (SSO, integrations)
- PBKDF2-SHA512 key derivation (100k iterations)
- Bcrypt cost factor 12 for passwords
- 3-tier rate limiting (10/100/1000 req/min)
- Arcjet WAF protection
- Helmet.js security headers
- CSRF protection with honeypots
- HttpOnly, Secure, SameSite cookies
- Comprehensive audit logging

**Environment Variables**:
- `SESSION_SECRET` - Required, validated on startup
- `ENCRYPTION_KEY` - 32 characters for general encryption
- `SSO_ENCRYPTION_KEY` - 64 hex chars (32 bytes) for SSO
- `INTEGRATION_ENCRYPTION_KEY` - 64 hex chars for integrations
- See `.env.example` for complete list

## PR & Commit Guidelines

**Pre-commit Checks**:
- Husky runs `lint-staged` on commit
- Must pass: Prettier, ESLint, Oxlint, TypeCheck on staged files
- Fix issues before committing

**Before Submitting PR**:
```bash
npm run validate  # Must pass: lint + typecheck + test + e2e
```

**Branch Naming**: Use `pr/your-feature-name` format

**Commit Messages**:
- Clear, descriptive messages
- Reference issue numbers where applicable
- Format: `feat(scope): description` or `fix(scope): description`

**PR Requirements**:
- All CI checks must pass (lint, typecheck, unit tests, E2E tests)
- No merge to `main` or `dev` without passing tests
- Code review required

## Database Operations

**Prisma Workflow**:
```bash
# After schema changes in packages/prisma/schema.prisma
cd packages/prisma
npx prisma migrate dev --name your_migration_name
npx prisma generate  # Regenerate Prisma Client

# View data
npm run db:studio    # Opens Prisma Studio on localhost:5555
```

**LiteFS Notes**:
- SQLite replication across Fly.io regions
- Database at `/litefs/data/sqlite.db` in production
- Local: `./packages/prisma/data.db`
- Use "widen then narrow" migration strategy for zero-downtime

## Deployment

**Platform**: Fly.io with Docker containers

**Deployment Trigger**: Push to `main` (production) or `dev` (staging)

**CI/CD Pipeline** (GitHub Actions):
1. Lint with Oxlint
2. Build + TypeCheck
3. Unit tests (Vitest)
4. E2E tests (Playwright, 60min timeout)
5. Docker build
6. Deploy to Fly.io

**Zero-Downtime Deployments**:
- Multiple instances run simultaneously
- LiteFS handles database replication
- Health checks: `/resources/healthcheck`, `/litefs/health`

## Internationalization

**LinguiJS** for translations:
```bash
npm run lingui:extract  # Extract translatable strings
```

- RTL support enabled (Arabic, Hebrew, etc.)
- Translation files in locale directories

## Monorepo Navigation

**Package Structure**:
```bash
pnpm dlx turbo run <command> --filter=<package_name>  # Run command in package
npm install --prefix packages/<name>                   # Install deps in package
```

**Key Packages**:
- `@repo/ui` - Shared components (Radix UI + Tailwind)
- `@repo/auth` - Authentication & RBAC
- `@repo/prisma` - Database schema & client
- `@repo/config` - Shared configs (ESLint, TypeScript, Prettier)
- `@repo/ai` - AI/ML integrations (Vercel AI SDK, Google AI)
- `@repo/security` - Security utilities (encryption, rate limiting)

## Additional Resources

- **Docs**: `/docs` directory (84 files covering all aspects)
- **Contributing**: See `CONTRIBUTING.md`
- **Security**: See `SECURITY_AUDIT_REPORT.md`
- **Getting Started**: See `docs/getting-started.md`
- **Testing Guide**: See `docs/testing.md`
