# AGENTS.md

This file provides AI coding agents with essential context for working on the
Epic Stack monorepo.

## Project Overview

**Epic Stack** is a production-ready, full-stack SaaS template built as an
Nx-based monorepo with npm workspaces. It includes multiple apps (main app,
marketing site, admin dashboard, mobile app, CMS, background jobs, email
templates, notifications) and shared packages (UI, auth, AI, payments, storage,
security, i18n, etc.).

**Tech Stack**: React 19 + React Router 7, Node.js 22, SQLite + Prisma, Tailwind
CSS 4, TypeScript, Expo (mobile), Astro (marketing), deployed on Fly.io with
LiteFS for distributed SQLite.

**Monorepo Structure**:

- `/apps/*` - Applications (app, web, admin, mobile, cms, etc.)
- `/packages/*` - Shared packages (ui, auth, prisma, config, ai, payments, etc.)
- `/docs/*` - Comprehensive documentation (84 markdown files)

## Setup Commands

```bash
# Initial setup (one-time)
git clone <your-fork>
cd epic-startup
cp .env.example .env
PUPPETEER_SKIP_DOWNLOAD=true npm install && npm run setup -s

# Install Playwright browsers for E2E tests
npm run test:e2e:install
```

**Requirements**:

- Node.js 22.15.0, npm 10.9.0 (pinned with Volta)
- Docker Desktop (for local MongoDB used by CMS)

## Development

```bash
# Start all apps in parallel (includes Docker services)
npm run dev

# Docker services are started automatically with npm run dev
# Manual control if needed:
npm run dev:services        # Start Docker services (MongoDB)
npm run dev:services:stop   # Stop Docker services
npm run dev:services:logs   # View Docker logs

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

**Docker Services**: MongoDB runs automatically via Docker Compose when you run
`npm run dev`. Docker Desktop must be installed and running. See
`docs/docker-services.md` for troubleshooting.

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

## ESLint Best Practices

**Fixing ESLint Warnings in Bulk**:

When encountering many ESLint warnings, follow this systematic approach:

1. **Run ESLint with auto-fix first**:

   ```bash
   cd apps/<app-name>
   npx eslint . --ext .js,.jsx,.ts,.tsx --fix
   ```

   This typically fixes 80-90% of warnings automatically (import order,
   formatting, etc.)

2. **Identify remaining warnings by category**:
   - Import order issues
   - Unused variables
   - React hooks dependencies
   - Type imports

3. **Fix manually in priority order**:
   - Security-related warnings (first priority)
   - Unused variables (quick wins)
   - Import order (remaining after auto-fix)
   - React hooks exhaustive-deps (requires code understanding)

**Common ESLint Warning Patterns**:

**1. Import Order (`import/order`)**:

Epic Stack enforces specific import ordering:

```typescript
// ✅ Correct order
import { useState } from 'react' // 1. External dependencies
import { useNavigate } from 'react-router' // 2. External dependencies
import { Button } from '@repo/ui/button' // 3. Monorepo packages (@repo/*)
import { prisma } from '@repo/database' // 4. Monorepo packages
import { requireUserId } from '#app/utils/auth.server.ts' // 5. App imports (#app/*)
import { EmptyState } from '#app/components/empty-state.tsx' // 6. App imports
import { type Route } from './+types/route-name' // 7. Relative imports
import { NoteEditor } from './note-editor' // 8. Relative imports

// ❌ Wrong order - causes warnings
import { requireUserId } from '#app/utils/auth.server.ts'
import { Button } from '@repo/ui/button'
import { useState } from 'react' // External should come first
```

**Key rules**:

- External packages first (react, react-router, third-party libs)
- Monorepo packages second (`@repo/*`)
- App-specific imports third (`#app/*`, `#tests/*`)
- Relative imports last (`./`, `../`)
- Within each group, alphabetical order by module path

**2. Unused Variables (`@typescript-eslint/no-unused-vars`)**:

The project convention requires unused variables to have an `ignored` prefix:

```typescript
// ✅ Correct - prefix with 'ignored'
const { data, ignoredMetadata } = response
const [ignoredSearchParams] = useSearchParams()
const ignoredActionData = useActionData()

// ❌ Wrong - underscore prefix not allowed
const { data, _metadata } = response
const [_searchParams] = useSearchParams()

// ❌ Wrong - generic underscore not allowed
const { data, _ } = response
```

**ESLint config**: Variables must match `/^ignored/u` pattern to be allowed as
unused.

**3. React Hooks Exhaustive Dependencies (`react-hooks/exhaustive-deps`)**:

When useEffect/useCallback/useMemo have missing dependencies:

```typescript
// ❌ Wrong - missing dependencies
const handleChange = (key: string, value: string) => {
	const newParams = new URLSearchParams(searchParams)
	newParams.set(key, value)
	setSearchParams(newParams)
}

useEffect(() => {
	if (searchValue !== data.filters.search) {
		handleChange('search', searchValue)
	}
}, [searchValue]) // ⚠️ Missing: data.filters.search, handleChange

// ✅ Correct - wrap in useCallback and add all dependencies
const handleChange = useCallback(
	(key: string, value: string) => {
		const newParams = new URLSearchParams(searchParams)
		newParams.set(key, value)
		setSearchParams(newParams)
	},
	[searchParams, setSearchParams],
)

useEffect(() => {
	if (searchValue !== data.filters.search) {
		handleChange('search', searchValue)
	}
}, [searchValue, data.filters.search, handleChange]) // ✅ All deps included
```

**4. Type Import Specifiers (`import/consistent-type-specifier-style`)**:

Prefer inline type specifiers over top-level type-only imports:

```typescript
// ✅ Correct - inline type specifier
import { type LoaderFunctionArgs } from 'react-router'
import { type User, prisma } from '@repo/database'

// ❌ Wrong - top-level type-only import
import type { LoaderFunctionArgs } from 'react-router'
import type { User } from '@repo/database'
import { prisma } from '@repo/database'
```

**5. Duplicate Imports (`import/no-duplicates`)**:

Combine multiple imports from the same module:

```typescript
// ✅ Correct - single import
import { useLoaderData, Form, useActionData } from 'react-router'

// ❌ Wrong - duplicate imports
import { useLoaderData } from 'react-router'
import { Form } from 'react-router'
import { useActionData } from 'react-router'
```

**Pre-commit Hook Considerations**:

- Pre-commit hooks run ESLint, Prettier, and TypeCheck via Husky + lint-staged
- Large changesets may timeout during pre-commit checks
- If pre-commit fails due to timeout (not errors):
  1. Verify changes pass individually: `npm run lint`, `npm run typecheck`
  2. Use `git commit --no-verify` only if you've verified the changes are
     correct
  3. Note this in commit message for transparency

**Workflow for Clean Commits**:

```bash
# 1. Auto-fix what you can
npx eslint . --ext .js,.jsx,.ts,.tsx --fix

# 2. Run full linting suite
npm run lint:all

# 3. Type check
npm run typecheck

# 4. If all pass, commit
git add -A
git commit -m "fix: resolve ESLint warnings"

# 5. If pre-commit times out but checks passed above
git commit --no-verify -m "fix: resolve ESLint warnings (verified manually)"
```

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
- ALWAYS validate environment variables on app startup (`SESSION_SECRET`,
  encryption keys)
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
- `USE_S3_STORAGE` - Set to `true` to use S3 in CMS (default: local in dev)
- See `.env.example` for complete list

**CMS Storage**:

- **Development**: Uses local file storage (`apps/cms/public/media/`)
- **Production**: Uses S3-compatible storage (Tigris, AWS S3)
- Toggle with `USE_S3_STORAGE` environment variable
- See `docs/cms-storage.md` for details

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
# After schema changes in packages/database/schema.prisma
cd packages/database
npx prisma migrate dev --name your_migration_name
npx prisma generate  # Regenerate Prisma Client

# View data
npm run db:studio    # Opens Prisma Studio on localhost:5555
```

**LiteFS Notes**:

- SQLite replication across Fly.io regions
- Database at `/litefs/data/sqlite.db` in production
- Local: `./packages/database/data.db`
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
- `@repo/database` - Database schema & client
- `@repo/config` - Shared configs (ESLint, TypeScript, Prettier)
- `@repo/ai` - AI/ML integrations (Vercel AI SDK, Google AI)
- `@repo/security` - Security utilities (encryption, rate limiting)

## Additional Resources

- **Docs**: `/docs` directory (84 files covering all aspects)
- **Contributing**: See `CONTRIBUTING.md`
- **Security**: See `SECURITY_AUDIT_REPORT.md`
- **Getting Started**: See `docs/getting-started.md`
- **Testing Guide**: See `docs/testing.md`
