# CLAUDE.md

**Comprehensive Guide for AI Assistants Working on Epic Stack**

This document provides detailed guidance for AI assistants (like Claude) to effectively understand, navigate, and contribute to the Epic Stack monorepo. It covers architecture, patterns, conventions, and workflows specific to this codebase.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Codebase Architecture](#codebase-architecture)
4. [Development Workflows](#development-workflows)
5. [Routing & Navigation](#routing--navigation)
6. [Component Patterns](#component-patterns)
7. [Data Loading & Mutations](#data-loading--mutations)
8. [Database Patterns](#database-patterns)
9. [Authentication & Authorization](#authentication--authorization)
10. [Testing Patterns](#testing-patterns)
11. [Common Tasks & Recipes](#common-tasks--recipes)
12. [Security Guidelines](#security-guidelines)
13. [Code Conventions](#code-conventions)
14. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Essential Context

**Project**: Epic Stack - Production-ready full-stack SaaS template
**Architecture**: Nx monorepo with npm workspaces
**Primary Stack**: React 19 + React Router 7, Node.js 22, SQLite + Prisma, Tailwind CSS 4
**Deployment**: Fly.io with Docker + LiteFS (distributed SQLite)

### Initial Setup Commands

```bash
# Clone and setup (one-time)
git clone <repo-url>
cd epic-stack
cp .env.example .env
npm install && npm run setup -s
npm run test:e2e:install  # Install Playwright browsers

# Start development
npm run dev  # Starts all apps with dev proxy on localhost:3000

# Individual apps
npm run dev:app     # Main app (React Router) - port 3001
npm run dev:web     # Marketing site (Astro) - port 3002
npm run dev:mobile  # Mobile app (Expo)
```

### Essential File Locations

```
apps/app/app/
├── routes/          # ALL route files (flat structure)
├── components/      # Shared React components
├── utils/           # Utilities (*.server.ts for server-only)
└── root.tsx         # Root layout

packages/
├── ui/              # Shared UI components (Radix + Tailwind)
├── prisma/          # Database schema & client
├── auth/            # Authentication logic
├── security/        # Security utilities (encryption, rate limiting)
└── config/          # Shared configs (ESLint, TypeScript)

tests/
├── fixtures/        # Test data factories
├── mocks/           # MSW mock handlers
└── e2e/             # Playwright E2E tests
```

---

## Project Overview

### Monorepo Structure

```
epic-stack/
├── apps/                    # Applications
│   ├── app/                # Main React Router app (port 3001)
│   ├── web/                # Astro marketing site (port 3002)
│   ├── admin/              # Admin dashboard
│   ├── mobile/             # Expo mobile app
│   ├── cms/                # CMS application
│   ├── background-jobs/    # Trigger.dev background jobs
│   ├── docs/               # Mintlify documentation
│   ├── email/              # React Email templates
│   ├── notifications/      # Novu notification workflows
│   ├── studio/             # Prisma Studio
│   └── chrome-extension/   # Chrome extension
│
├── packages/               # Shared packages
│   ├── ui/                # UI components (Radix + Tailwind)
│   ├── auth/              # Authentication & RBAC
│   ├── prisma/            # Database schema & client
│   ├── security/          # Encryption, rate limiting, WAF
│   ├── ai/                # AI/ML integrations (Vercel AI SDK)
│   ├── payments/          # Stripe integration
│   ├── storage/           # S3/file upload
│   ├── email/             # Email templates & sending
│   ├── notifications/     # Notification workflows
│   ├── background-jobs/   # Background job definitions
│   ├── integrations/      # Third-party integrations
│   ├── analytics/         # Analytics tracking
│   ├── i18n/              # Internationalization (LinguiJS)
│   ├── cache/             # Caching utilities
│   ├── observability/     # Logging & monitoring
│   ├── validation/        # Shared Zod schemas
│   ├── common/            # Common utilities
│   ├── types/             # Shared TypeScript types
│   ├── config/            # ESLint, Prettier, TypeScript configs
│   └── test-utils/        # Testing utilities
│
├── tests/                 # Test infrastructure
│   ├── setup/            # Test configuration
│   ├── fixtures/         # Test data factories
│   ├── mocks/            # MSW mock handlers
│   └── e2e/              # Playwright E2E tests
│
└── docs/                 # Documentation (84 markdown files)
```

### Key Technologies

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, React Router 7, Tailwind CSS 4, Radix UI |
| **Backend** | Node.js 22, Express |
| **Database** | SQLite + Prisma, LiteFS (replication) |
| **Mobile** | Expo (React Native) |
| **Marketing** | Astro |
| **Styling** | Tailwind CSS 4, class-variance-authority |
| **Forms** | conform-to, Zod validation |
| **Auth** | Custom auth + OAuth providers, TOTP 2FA |
| **Payments** | Stripe |
| **Email** | Resend + React Email |
| **Notifications** | Novu |
| **Background Jobs** | Trigger.dev |
| **AI/ML** | Vercel AI SDK, Google AI |
| **Testing** | Vitest, Playwright, Testing Library |
| **Build** | Vite, Nx |
| **Deployment** | Fly.io, Docker, LiteFS |

---

## Codebase Architecture

### Import Path Aliases

All projects use TypeScript path aliases for clean imports:

```typescript
// App-specific aliases
import { Button } from '#app/components/button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { createUser } from '#tests/fixtures/user.ts'

// Package aliases (available everywhere)
import { Button } from '@repo/ui/button'
import { prisma } from '@repo/prisma'
import { EmailSchema } from '@repo/validation'
import { encryptData } from '@repo/security'
```

**Configuration** (`apps/app/tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "#app/*": ["./app/*"],
      "#tests/*": ["./tests/*"],
      "@repo/ui": ["../../packages/ui"],
      "@repo/prisma": ["../../packages/prisma"]
    }
  }
}
```

### Server vs Client Code

**Critical Pattern**: Files ending in `.server.ts` or `.server.tsx` are server-only and excluded from client bundles.

```typescript
// ✅ Server-only file
// app/utils/auth.server.ts
export async function requireUserId(request: Request) {
  // This code NEVER runs in browser
  const session = await getSession(request)
  return session.userId
}

// ✅ Client-safe file
// app/utils/misc.tsx
export function cn(...classes: ClassValue[]) {
  // This code runs on both server and client
  return clsx(classes)
}
```

**Naming Rule**: If a file accesses server-only APIs (database, filesystem, env vars), it MUST have `.server.ts` suffix.

### Package Organization

Packages in `packages/` are imported using `@repo/*` alias:

```typescript
// Package exports (packages/ui/package.json)
{
  "name": "@repo/ui",
  "exports": {
    ".": "./index.ts",
    "./button": "./components/button.tsx",
    "./icon": "./components/icon.tsx"
  }
}

// Usage in apps
import { Button } from '@repo/ui/button'  // Specific import
import { cn } from '@repo/ui'             // Index export
```

---

## Development Workflows

### Starting Development

```bash
# Start ALL apps with dev proxy (recommended)
npm run dev
# Accesses at http://localhost:3000 (proxy routes to apps)

# Start specific app
npm run dev:app      # Main app only (port 3001)
npm run dev:web      # Marketing site only (port 3002)
npm run dev:mobile   # Mobile app (Expo)

# Database
npm run db:studio    # Prisma Studio UI (port 5555)
npm run db:push      # Push schema changes (dev)
npm run db:migrate   # Create migration (production-ready)
npm run db:seed      # Seed with test data
```

### Build & Validation

```bash
# Full build pipeline
npm run build        # Build all apps & packages

# Type checking
npm run typecheck    # Check all packages

# Linting
npm run lint         # ESLint (via Nx)
npm run lint:oxc     # Oxlint (Rust-based, fast)
npm run lint:all     # Both linters

# Formatting
npm run format       # Prettier (auto-fix)
npm run format:check # Check only (CI)

# Testing
npm run test              # Unit tests (Vitest watch mode)
npm run test:e2e          # E2E tests (Playwright UI mode)
npm run test:e2e:run      # E2E headless (CI mode)
```

### Pre-commit Hooks

**Husky + lint-staged** runs automatically on `git commit`:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,json,css,md}": ["prettier --write"],
    "*.{js,jsx,ts,tsx}": ["oxlint --fix"],
    "*.{ts,tsx}": ["npm run typecheck"]
  }
}
```

**What happens**:
1. Format staged files with Prettier
2. Lint with Oxlint
3. Type-check TypeScript files
4. Commit fails if any errors

**Before PR**: Always run full validation:
```bash
npm run lint:all && npm run typecheck && npm run test && npm run test:e2e:run
```

### Database Workflow

```bash
# 1. Edit schema
vim packages/prisma/schema.prisma

# 2. Create migration (production-ready)
cd packages/prisma
npx prisma migrate dev --name add_user_preferences

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Apply in production
npx prisma migrate deploy
```

**Key Commands**:
- `prisma migrate dev` - Create migration + apply (dev)
- `prisma migrate deploy` - Apply migrations (production)
- `prisma db push` - Quick schema sync (dev only, skips migrations)
- `prisma studio` - Visual database editor

### Adding New Routes

1. **Create route file** in `apps/app/app/routes/`:

```typescript
// apps/app/app/routes/_app+/settings.profile.tsx
import { type Route } from './+types/settings.profile'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return { user }
}

export default function SettingsProfile({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.user.name}</div>
}
```

2. **Route becomes available** at `/settings/profile` (auto-discovered by React Router)

### Adding New Components

1. **Create in packages/ui** for reusable components:

```typescript
// packages/ui/components/card.tsx
import { type ReactNode } from 'react'
import { cn } from '../utils/cn'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {children}
    </div>
  )
}
```

2. **Export in packages/ui/index.ts**:

```typescript
export { Card } from './components/card'
```

3. **Use in any app**:

```typescript
import { Card } from '@repo/ui'

export default function MyPage() {
  return <Card>Content</Card>
}
```

### Creating New Packages

1. **Create package directory**:

```bash
mkdir -p packages/my-package/src
cd packages/my-package
npm init -y
```

2. **Configure package.json**:

```json
{
  "name": "@repo/my-package",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

3. **Add to root package.json workspaces** (already configured):

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

4. **Create src/index.ts** and export functions

5. **Install in app**:

```bash
cd apps/app
npm install @repo/my-package@*
```

---

## Routing & Navigation

### Flat Routes Convention

Epic Stack uses **flat-routes** pattern (not nested folders):

```
routes/
├── _app+/                    # Layout route (+ means folder)
│   ├── _layout.tsx          # Layout wrapper
│   ├── index.tsx            # /
│   ├── settings.tsx         # /settings
│   └── settings.profile.tsx # /settings/profile
├── _auth+/
│   ├── login.tsx            # /login
│   └── signup.tsx           # /signup
├── api+/
│   └── auth.logout.ts       # /api/auth/logout
└── $.tsx                    # Catch-all (404)
```

**URL Mapping**:
- `index.tsx` → `/`
- `about.tsx` → `/about`
- `blog.index.tsx` → `/blog`
- `blog.$slug.tsx` → `/blog/:slug`
- `_layout.tsx` → Wraps child routes (doesn't add URL segment)

### Route Patterns

#### Basic Route

```typescript
// routes/about.tsx
export default function About() {
  return <h1>About Us</h1>
}
```

#### Layout Route (wraps children)

```typescript
// routes/_app+/_layout.tsx
import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main>
        <Outlet />  {/* Child routes render here */}
      </main>
    </div>
  )
}
```

**File naming**:
- `_app+/` - Folder (+ means contains routes)
- `_layout.tsx` - Layout component (underscore = pathless)

#### Dynamic Routes

```typescript
// routes/_app+/notes.$noteId.tsx
import { type Route } from './+types/notes.$noteId'

export async function loader({ params }: Route.LoaderArgs) {
  const note = await prisma.note.findUnique({
    where: { id: params.noteId }
  })

  invariantResponse(note, 'Note not found', { status: 404 })
  return { note }
}

export default function Note({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.note.title}</div>
}
```

**Access at**: `/notes/123`, `/notes/abc`, etc.

#### Optional Segments

```typescript
// routes/users.$userId_.tsx
// Matches: /users, /users/123
```

#### Catch-all Routes

```typescript
// routes/$.tsx
export default function NotFound() {
  return <h1>404 - Page Not Found</h1>
}
```

### Navigation

```typescript
import { Link, useNavigate } from 'react-router'

// Declarative navigation
<Link to="/about">About</Link>
<Link to={`/notes/${note.id}`}>View Note</Link>

// Programmatic navigation
const navigate = useNavigate()
navigate('/dashboard')
navigate(-1)  // Go back
```

---

## Component Patterns

### Basic Component Structure

```typescript
// packages/ui/components/alert.tsx
import { type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils/cn'
import { Icon, type IconName } from './icon'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive',
        success: 'border-success/50 text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode
  className?: string
  icon?: IconName
}

export function Alert({ children, className, variant, icon }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)}>
      {icon && <Icon name={icon} className="mr-2" />}
      {children}
    </div>
  )
}
```

**Key Patterns**:
1. Use `class-variance-authority` for variants
2. Use `cn()` utility for className merging
3. Export props interface for type safety
4. Use Radix UI primitives for complex components

### Icon System

```typescript
// Auto-generated type-safe icons
import { Icon } from '@repo/ui/icon'

<Icon name="home" />
<Icon name="chevron-right" size="lg" />
<Icon name="user" className="text-primary" />
```

**Icons are**:
- Type-safe (TypeScript autocomplete)
- Auto-generated from SVG files in `packages/ui/components/icons/`
- Rendered as sprite sheet (performance)

**Adding new icons**:
1. Add SVG file to `packages/ui/components/icons/`
2. Run `node packages/ui/generate-icons.js`
3. Use with `<Icon name="my-new-icon" />`

### Form Components

```typescript
import { Form, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { z } from 'zod'
import { Input } from '@repo/ui/input'
import { Button } from '@repo/ui/button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default function LoginForm() {
  const [form, fields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema })
    },
  })

  return (
    <Form method="post" {...form.props}>
      <Input
        {...fields.email.props}
        type="email"
        label="Email"
        error={fields.email.errors?.[0]}
      />
      <Input
        {...fields.password.props}
        type="password"
        label="Password"
        error={fields.password.errors?.[0]}
      />
      <Button type="submit">Sign In</Button>
    </Form>
  )
}
```

**Form Pattern**:
1. Define Zod schema for validation
2. Use conform-to for form state
3. Connect to server action via `method="post"`
4. Display field errors inline

### Radix UI Integration

```typescript
// packages/ui/components/dropdown-menu.tsx
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../utils/cn'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Content
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] rounded-md border bg-popover p-1',
      className
    )}
    {...props}
  />
))

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
}
```

**Usage**:
```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@repo/ui'

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Data Loading & Mutations

### Loader Pattern (GET requests)

```typescript
// routes/_app+/notes.$noteId.tsx
import { type Route } from './+types/notes.$noteId'
import { data } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '@repo/prisma'
import { invariantResponse } from '@epic-web/invariant'

export async function loader({ request, params }: Route.LoaderArgs) {
  // 1. Authenticate user
  const userId = await requireUserId(request)

  // 2. Fetch data
  const note = await prisma.note.findUnique({
    where: { id: params.noteId },
    select: {
      id: true,
      title: true,
      content: true,
      owner: { select: { id: true, name: true } },
    },
  })

  // 3. Validate data exists
  invariantResponse(note, 'Note not found', { status: 404 })

  // 4. Authorize access
  invariantResponse(
    note.owner.id === userId,
    'Not authorized',
    { status: 403 }
  )

  // 5. Return data with headers
  return data(
    { note },
    {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    }
  )
}

export default function NoteView({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.note.title}</div>
}
```

**Key Points**:
- Loaders run on server before rendering
- Use `data()` helper for type-safe responses
- Use `invariantResponse()` for assertions that throw responses
- Always authenticate/authorize in loaders
- Return only necessary data (use Prisma `select`)

### Action Pattern (POST/PUT/DELETE requests)

```typescript
// routes/_app+/notes.new.tsx
import { type Route } from './+types/notes.new'
import { redirect, data } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'

const NoteSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
})

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)

  // 1. Parse form data
  const formData = await request.formData()

  // 2. Validate with Zod
  const submission = await parseWithZod(formData, {
    schema: NoteSchema,
    async: true,  // Enable async validation
  })

  // 3. Handle validation errors
  if (submission.status !== 'success') {
    return data(
      { result: submission.reply() },
      { status: 400 }
    )
  }

  // 4. Create in database
  const note = await prisma.note.create({
    data: {
      ...submission.value,
      ownerId: userId,
    },
  })

  // 5. Redirect on success
  return redirect(`/notes/${note.id}`)
}

export default function NewNote({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: NoteSchema })
    },
  })

  return (
    <Form method="post" {...form.props}>
      <Input {...fields.title.props} label="Title" />
      <Textarea {...fields.content.props} label="Content" />
      <Button type="submit">Create Note</Button>
    </Form>
  )
}
```

**Action Flow**:
1. User submits form
2. Server action runs
3. Validates data with Zod
4. On error: returns validation errors
5. On success: creates record + redirects

### Optimistic UI Updates

```typescript
import { useFetcher } from 'react-router'

export function TodoItem({ todo }) {
  const fetcher = useFetcher()

  const isComplete = fetcher.formData
    ? fetcher.formData.get('complete') === 'true'
    : todo.complete

  return (
    <fetcher.Form method="post" action={`/todos/${todo.id}`}>
      <input
        type="checkbox"
        name="complete"
        value="true"
        checked={isComplete}
        onChange={(e) => fetcher.submit(e.currentTarget.form)}
      />
      <span className={isComplete ? 'line-through' : ''}>
        {todo.title}
      </span>
    </fetcher.Form>
  )
}
```

### Caching Pattern

```typescript
import { cachified } from '@epic-web/cachified'
import { cache } from '#app/utils/cache.server.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireUserId(request)

  const user = await cachified({
    key: `user:${userId}`,
    cache,
    ttl: 1000 * 60 * 5,  // 5 minutes
    getFreshValue: async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    },
  })

  return { user }
}
```

**Cache TTL Guidelines**:
- User data (security-sensitive): 1-5 minutes
- Public content: 15-60 minutes
- Static data: 24 hours

---

## Database Patterns

### Prisma Client Setup

```typescript
// packages/prisma/index.ts
import { PrismaClient } from '@prisma/client'
import { remember } from '@epic-web/remember'

export const prisma = remember('prisma', () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [{ level: 'query', emit: 'event' }]
      : [],
  })

  // Log slow queries
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e: any) => {
      if (e.duration > 20) {
        console.info(`[Prisma] Slow query (${e.duration}ms): ${e.query}`)
      }
    })
  }

  return client
})

export * from '@prisma/client'
```

**Re-export in app**:
```typescript
// app/utils/db.server.ts
import { prisma } from '@repo/prisma'
export { prisma }
```

### Query Patterns

#### Select-based Queries (Recommended)

```typescript
// ✅ Good: Only fetch needed fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    roles: {
      select: {
        name: true,
        permissions: {
          select: { entity: true, action: true }
        }
      }
    }
  }
})

// ❌ Bad: Fetches all fields (slow, insecure)
const user = await prisma.user.findUnique({
  where: { id: userId }
})
```

#### Filtering & Pagination

```typescript
const notes = await prisma.note.findMany({
  where: {
    ownerId: userId,
    title: { contains: searchTerm },
    createdAt: { gte: new Date('2024-01-01') },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: page * 20,
  select: {
    id: true,
    title: true,
    createdAt: true,
  },
})
```

#### Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
  // All operations must succeed or all fail
  const user = await tx.user.create({
    data: { email, name }
  })

  await tx.organization.create({
    data: {
      name: `${name}'s Org`,
      members: { connect: { id: user.id } }
    }
  })

  return user
})
```

#### Upsert Pattern

```typescript
const user = await prisma.user.upsert({
  where: { email },
  update: { name, lastLoginAt: new Date() },
  create: { email, name, lastLoginAt: new Date() },
})
```

### Schema Best Practices

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  notes     Note[]
  sessions  Session[]

  @@index([email])
}

model Note {
  id      String @id @default(cuid())
  title   String
  content String

  // Foreign keys
  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
}
```

**Guidelines**:
- Use `cuid()` for IDs (random, URL-safe)
- Always add `createdAt` and `updatedAt`
- Add indexes for foreign keys and frequently queried fields
- Use `onDelete: Cascade` for cleanup
- Use `@unique` for unique constraints

### Migrations

```bash
# Development workflow
cd packages/prisma

# 1. Edit schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_user_preferences

# 3. Regenerate client (auto after migrate dev)
npx prisma generate

# Production deployment
npx prisma migrate deploy
```

**Zero-downtime migrations** (widen-then-narrow strategy):
1. **Widen**: Add new nullable field
2. **Deploy**: App works with old & new schema
3. **Backfill**: Populate new field
4. **Narrow**: Make field required, remove old field

---

## Authentication & Authorization

### Session Management

```typescript
// app/utils/auth.server.ts
import { Authenticator } from 'remix-auth'
import { sessionStorage } from './session.server.ts'
import { prisma } from '@repo/prisma'

export const authenticator = new Authenticator<ProviderUser>(sessionStorage)

// Get user ID (returns null if not authenticated)
export async function getUserId(request: Request) {
  const authSession = await sessionStorage.getSession(
    request.headers.get('cookie')
  )
  const sessionId = authSession.get(sessionKey)

  if (!sessionId) return null

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, expirationDate: true }
  })

  if (!session || session.expirationDate < new Date()) {
    return null
  }

  return session.userId
}

// Require authentication (throws 401 if not authenticated)
export async function requireUserId(request: Request) {
  const userId = await getUserId(request)
  invariantResponse(userId, 'Must be authenticated', { status: 401 })
  return userId
}

// Logout
export async function logout({ request, redirectTo = '/' }) {
  const authSession = await sessionStorage.getSession(
    request.headers.get('cookie')
  )
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(authSession)
    }
  })
}
```

### Using Authentication in Routes

```typescript
// Protected route
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)  // Throws if not authenticated

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  return { user }
}

// Optional authentication
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request)  // Returns null if not authenticated

  if (!userId) {
    return { isAuthenticated: false }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  return { isAuthenticated: true, user }
}
```

### Authorization (RBAC)

```typescript
// app/utils/permissions.server.ts
import { requireUserId } from './auth.server.ts'

export async function requireUserWithRole(
  request: Request,
  role: string
) {
  const userId = await requireUserId(request)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roles: { select: { name: true } }
    }
  })

  invariantResponse(user, 'User not found', { status: 404 })

  const hasRole = user.roles.some(r => r.name === role)
  invariantResponse(hasRole, 'Not authorized', { status: 403 })

  return user
}

export async function requirePermission(
  request: Request,
  permission: { entity: string; action: string }
) {
  const userId = await requireUserId(request)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roles: {
        select: {
          permissions: {
            select: { entity: true, action: true }
          }
        }
      }
    }
  })

  invariantResponse(user, 'User not found', { status: 404 })

  const hasPermission = user.roles.some(role =>
    role.permissions.some(p =>
      p.entity === permission.entity && p.action === permission.action
    )
  )

  invariantResponse(hasPermission, 'Not authorized', { status: 403 })

  return user
}
```

**Usage in routes**:
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  await requirePermission(request, { entity: 'note', action: 'delete' })

  // User has permission, continue...
}
```

### OAuth Integration

```typescript
// packages/auth/providers/github.ts
import { GitHubStrategy } from 'remix-auth-github'

export const githubStrategy = new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: `${process.env.APP_URL}/auth/github/callback`,
  },
  async ({ profile }) => {
    // Return user data to be stored in session
    return {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatarUrl: profile.photos[0].value,
    }
  }
)
```

---

## Testing Patterns

### Unit Test Structure

```typescript
// app/utils/misc.test.ts
import { describe, it, expect } from 'vitest'
import { cn, getErrorMessage } from './misc'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('handles Tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('getErrorMessage', () => {
  it('extracts message from Error object', () => {
    const error = new Error('Something went wrong')
    expect(getErrorMessage(error)).toBe('Something went wrong')
  })

  it('handles string errors', () => {
    expect(getErrorMessage('Error string')).toBe('Error string')
  })

  it('returns unknown for non-standard errors', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('Unknown Error')
  })
})
```

### Component Testing

```typescript
// app/components/empty-state.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon="inbox"
        title="No items"
        description="Get started by creating a new item"
      />
    )

    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText(/Get started/)).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState
        icon="inbox"
        title="No items"
        action={<button>Create Item</button>}
      />
    )

    expect(screen.getByRole('button', { name: 'Create Item' })).toBeInTheDocument()
  })
})
```

### E2E Testing

```typescript
// tests/e2e/notes.test.ts
import { test, expect } from '@playwright/test'
import { createUser } from '#tests/fixtures/user'
import { createNote } from '#tests/fixtures/note'

test('user can create a note', async ({ page }) => {
  const user = await createUser()

  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Navigate to new note
  await page.click('a[href="/notes/new"]')

  // Fill form
  await page.fill('input[name="title"]', 'My Test Note')
  await page.fill('textarea[name="content"]', 'Note content here')
  await page.click('button[type="submit"]')

  // Verify redirect and content
  await expect(page).toHaveURL(/\/notes\/[a-z0-9]+/)
  await expect(page.locator('h1')).toHaveText('My Test Note')
  await expect(page.locator('p')).toHaveText('Note content here')
})

test('user can edit their own note', async ({ page }) => {
  const user = await createUser()
  const note = await createNote({ ownerId: user.id })

  // Login (could use authenticated fixture instead)
  await page.goto('/login')
  // ... login flow ...

  // Navigate to note
  await page.goto(`/notes/${note.id}`)

  // Click edit
  await page.click('a[href*="/edit"]')

  // Update content
  await page.fill('input[name="title"]', 'Updated Title')
  await page.click('button[type="submit"]')

  // Verify update
  await expect(page.locator('h1')).toHaveText('Updated Title')
})
```

### Test Fixtures (Auto-cleanup)

```typescript
// tests/fixtures/user.ts
import { prisma } from '@repo/prisma'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'

const cleanupCallbacks: Array<() => Promise<void>> = []

export function registerCleanup(callback: () => Promise<void>) {
  cleanupCallbacks.push(callback)
}

export async function cleanup() {
  for (const callback of cleanupCallbacks) {
    await callback()
  }
  cleanupCallbacks.length = 0
}

export async function createUser(data: Partial<User> = {}) {
  const user = await prisma.user.create({
    data: {
      email: data.email ?? faker.internet.email(),
      name: data.name ?? faker.person.fullName(),
      password: data.password
        ? await bcrypt.hash(data.password, 12)
        : await bcrypt.hash('password123', 12),
      ...data,
    },
  })

  // Auto-cleanup after test
  registerCleanup(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  })

  return user
}
```

**Usage**:
```typescript
import { afterEach } from 'vitest'
import { cleanup, createUser } from '#tests/fixtures/user'

afterEach(async () => {
  await cleanup()
})

test('something', async () => {
  const user = await createUser()  // Auto-deleted after test
  // ...
})
```

### MSW Mocks

```typescript
// tests/mocks/github.ts
import { http, HttpResponse } from 'msw'

export const githubHandlers = [
  http.get('https://api.github.com/user', () => {
    return HttpResponse.json({
      id: 123456,
      login: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    })
  }),

  http.get('https://api.github.com/user/repos', () => {
    return HttpResponse.json([
      { id: 1, name: 'repo1', full_name: 'testuser/repo1' },
      { id: 2, name: 'repo2', full_name: 'testuser/repo2' },
    ])
  }),
]
```

**Setup**:
```typescript
// tests/setup/setup-test-env.ts
import { setupServer } from 'msw/node'
import { githubHandlers } from '#tests/mocks/github'

export const server = setupServer(...githubHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Common Tasks & Recipes

### Adding a New Feature

1. **Create database schema** (if needed):

```prisma
// packages/prisma/schema.prisma
model Feature {
  id        String   @id @default(cuid())
  name      String
  enabled   Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([name])
}
```

```bash
cd packages/prisma
npx prisma migrate dev --name add_feature_model
```

2. **Create route**:

```typescript
// apps/app/app/routes/_app+/features.tsx
import { type Route } from './+types/features'

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request)

  const features = await prisma.feature.findMany({
    orderBy: { name: 'asc' }
  })

  return { features }
}

export default function Features({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1>Features</h1>
      <ul>
        {loaderData.features.map(feature => (
          <li key={feature.id}>{feature.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

3. **Add navigation**:

```typescript
// apps/app/app/components/sidebar.tsx
<nav>
  <Link to="/features">Features</Link>
</nav>
```

4. **Write tests**:

```typescript
// apps/app/app/routes/_app+/features.test.tsx
import { test, expect } from '@playwright/test'

test('displays features list', async ({ page }) => {
  await createFeature({ name: 'Feature 1' })
  await createFeature({ name: 'Feature 2' })

  await page.goto('/features')

  await expect(page.locator('text=Feature 1')).toBeVisible()
  await expect(page.locator('text=Feature 2')).toBeVisible()
})
```

### Adding Form Validation

```typescript
// 1. Create Zod schema
const FeatureSchema = z.object({
  name: z.string().min(3).max(50),
  enabled: z.boolean().default(false),
})

// 2. Use in action
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()

  const submission = await parseWithZod(formData, {
    schema: FeatureSchema,
  })

  if (submission.status !== 'success') {
    return data({ result: submission.reply() }, { status: 400 })
  }

  await prisma.feature.create({ data: submission.value })

  return redirect('/features')
}

// 3. Use in form
export default function NewFeature({ actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: FeatureSchema })
    },
  })

  return (
    <Form method="post" {...form.props}>
      <Input
        {...fields.name.props}
        label="Feature Name"
        error={fields.name.errors?.[0]}
      />
      <Checkbox
        {...fields.enabled.props}
        label="Enabled"
      />
      <Button type="submit">Create</Button>
    </Form>
  )
}
```

### Adding Background Job

```typescript
// packages/background-jobs/src/send-welcome-email.ts
import { client } from './client'

export const sendWelcomeEmailJob = client.defineJob({
  id: 'send-welcome-email',
  name: 'Send Welcome Email',
  version: '1.0.0',
  trigger: eventTrigger({
    name: 'user.created',
  }),
  run: async (payload, io) => {
    await io.logger.info('Sending welcome email', { userId: payload.userId })

    const user = await io.prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    await io.resend.emails.send({
      from: 'Epic Stack <onboarding@example.com>',
      to: user.email,
      subject: 'Welcome to Epic Stack!',
      react: <WelcomeEmail user={user} />,
    })
  },
})
```

**Trigger from app**:
```typescript
// After user creation
await sendWelcomeEmailJob.trigger({ userId: user.id })
```

### Adding API Endpoint

```typescript
// apps/app/app/routes/api+/features.ts
import { type Route } from './+types/features'
import { json } from 'react-router'

export async function loader({ request }: Route.LoaderArgs) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key')
  invariantResponse(apiKey === process.env.API_KEY, 'Invalid API key', {
    status: 401,
  })

  const features = await prisma.feature.findMany()

  return json({ features })
}

export async function action({ request }: Route.ActionArgs) {
  const apiKey = request.headers.get('x-api-key')
  invariantResponse(apiKey === process.env.API_KEY, 'Invalid API key', {
    status: 401,
  })

  if (request.method === 'POST') {
    const body = await request.json()

    const feature = await prisma.feature.create({
      data: body,
    })

    return json({ feature }, { status: 201 })
  }

  throw new Response('Method not allowed', { status: 405 })
}
```

**Usage**:
```bash
curl http://localhost:3001/api/features \
  -H "x-api-key: your-api-key"
```

### Implementing Real-time Features

```typescript
// Using Server-Sent Events (SSE)
// apps/app/app/routes/api+/events.ts
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)

  const stream = new ReadableStream({
    start(controller) {
      // Send initial event
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

      // Setup interval for updates
      const interval = setInterval(async () => {
        const updates = await getUpdatesForUser(userId)

        if (updates.length > 0) {
          controller.enqueue(
            `data: ${JSON.stringify({ type: 'updates', data: updates })}\n\n`
          )
        }
      }, 5000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Client**:
```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/events')

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('Received update:', data)
  }

  return () => eventSource.close()
}, [])
```

---

## Security Guidelines

### Input Validation

**Always validate user input with Zod**:

```typescript
// ✅ Good
const EmailSchema = z.string().email()
const PasswordSchema = z.string().min(8).max(72)

const submission = await parseWithZod(formData, {
  schema: z.object({
    email: EmailSchema,
    password: PasswordSchema,
  }),
})

// ❌ Bad - No validation
const email = formData.get('email')
const user = await prisma.user.create({ data: { email } })
```

### XSS Prevention

**Sanitize user-generated HTML**:

```typescript
import DOMPurify from 'isomorphic-dompurify'

// ✅ Good
const sanitizedHtml = DOMPurify.sanitize(userInput)
return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

// ❌ Bad - Direct HTML injection
return <div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### SQL Injection Prevention

**Prisma prevents SQL injection automatically**:

```typescript
// ✅ Safe - Prisma parameterizes queries
const user = await prisma.user.findUnique({
  where: { email: userEmail }  // Automatically escaped
})

// ⚠️ Raw SQL - Only use with extreme caution
const users = await prisma.$queryRaw`
  SELECT * FROM User WHERE email = ${userEmail}
`  // Parameterized (safe), but avoid if possible
```

### Password Security

```typescript
import bcrypt from 'bcryptjs'

// ✅ Hash passwords with bcrypt cost 12
const hashedPassword = await bcrypt.hash(password, 12)

// Verify
const isValid = await bcrypt.compare(password, user.hashedPassword)

// ❌ Never store plain text
// ❌ Never reduce bcrypt cost below 12
```

### Encryption

```typescript
import { encrypt, decrypt } from '@repo/security'

// Encrypt sensitive data
const encrypted = encrypt(sensitiveData)
await prisma.integration.create({
  data: {
    apiKey: encrypted,
  }
})

// Decrypt when needed
const decrypted = decrypt(integration.apiKey)
```

### Environment Variables

```typescript
// app/utils/env.server.ts
import { invariantResponse } from '@epic-web/invariant'

// Validate critical env vars on startup
const ENV = {
  SESSION_SECRET: process.env.SESSION_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
}

invariantResponse(ENV.SESSION_SECRET, 'SESSION_SECRET is required')
invariantResponse(
  ENV.ENCRYPTION_KEY?.length === 32,
  'ENCRYPTION_KEY must be 32 characters'
)

export { ENV }
```

### Rate Limiting

```typescript
// Already configured via Arcjet in root.tsx
// Custom rate limiting for specific endpoints:

import { ratelimit } from '#app/utils/rate-limit.server.ts'

export async function action({ request }: Route.ActionArgs) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  const { success } = await ratelimit.limit(ip)

  if (!success) {
    throw new Response('Too many requests', { status: 429 })
  }

  // Continue with action...
}
```

### CSRF Protection

```typescript
// Built into conform-to forms automatically
// Honeypot fields prevent automated submissions

import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { honeypot } from '#app/utils/honeypot.server.ts'

<Form method="post">
  <HoneypotInputs />
  {/* other fields */}
</Form>

// In action
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  honeypot.check(formData)  // Throws if honeypot triggered

  // Continue...
}
```

### Audit Logging

```typescript
// Log security-sensitive operations
await prisma.auditLog.create({
  data: {
    userId,
    action: 'user.password.changed',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    metadata: { /* additional context */ },
  },
})
```

---

## Code Conventions

### File Naming

| Type | Convention | Examples |
|------|-----------|----------|
| Components | PascalCase.tsx | `EmptyState.tsx`, `UserProfile.tsx` |
| Routes | kebab-case.tsx | `settings.profile.tsx`, `notes.$noteId.tsx` |
| Utilities | kebab-case.ts | `auth.server.ts`, `misc.tsx` |
| Tests | *.test.ts(x) | `auth.server.test.ts`, `button.test.tsx` |
| Server-only | *.server.ts | `db.server.ts`, `email.server.ts` |

### Import Ordering

```typescript
// 1. External dependencies
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'

// 2. Monorepo packages
import { Button } from '@repo/ui/button'
import { prisma } from '@repo/prisma'

// 3. App imports (absolute with #app)
import { requireUserId } from '#app/utils/auth.server.ts'
import { EmptyState } from '#app/components/empty-state.tsx'

// 4. Relative imports (same directory)
import { type Route } from './+types/route-name'
import { NoteEditor } from './note-editor'
```

### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}
export function EmptyState() {}

// Functions: camelCase
export function getUserId() {}
export async function requireUserId() {}

// Variables: camelCase
const userId = '123'
const organizationSlug = 'my-org'

// Constants: SCREAMING_SNAKE_CASE
const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Types/Interfaces: PascalCase
interface UserPreferences {}
type LoaderData = {}

// Private functions: _camelCase (prefix with underscore)
function _internalHelper() {}
```

### TypeScript Best Practices

```typescript
// ✅ Use type inference where possible
const user = await prisma.user.findUnique({ where: { id } })
// Type is inferred as User | null

// ✅ Explicit return types for exported functions
export async function getUser(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

// ✅ Use const assertions for literal types
const ALLOWED_ROLES = ['admin', 'user', 'guest'] as const
type Role = typeof ALLOWED_ROLES[number]  // 'admin' | 'user' | 'guest'

// ✅ Use generics for reusable code
function createResponse<T>(data: T) {
  return { data, timestamp: Date.now() }
}

// ✅ Avoid 'any', use 'unknown' instead
function parseJson(str: string): unknown {
  return JSON.parse(str)
}
```

### Component Patterns

```typescript
// ✅ Props interface with exported type
interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>
}

// ✅ Compound components
export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>
}

Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  return <div className="card-header">{children}</div>
}

Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div className="card-body">{children}</div>
}

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Error Handling

```typescript
// ✅ Use invariantResponse for server assertions
import { invariantResponse } from '@epic-web/invariant'

const note = await prisma.note.findUnique({ where: { id } })
invariantResponse(note, 'Note not found', { status: 404 })
// note is now typed as Note (not Note | null)

// ✅ Use try-catch for expected errors
try {
  await sendEmail(user.email)
} catch (error) {
  console.error('Failed to send email:', getErrorMessage(error))
  // Continue execution or handle gracefully
}

// ✅ Generic error boundaries
export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Unexpected Error</h1>
      <p>{getErrorMessage(error)}</p>
    </div>
  )
}
```

---

## Troubleshooting

### Common Issues

#### Port already in use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev:app
```

#### Database out of sync

```bash
cd packages/prisma

# Reset database (destructive)
npx prisma migrate reset

# Or apply pending migrations
npx prisma migrate deploy

# Regenerate client
npx prisma generate
```

#### Type errors after package update

```bash
# Clear Nx cache
npx nx reset

# Rebuild all packages
npm run build

# Regenerate Prisma client
cd packages/prisma && npx prisma generate
```

#### Tests failing

```bash
# Clear test cache
npm run test -- --clearCache

# Run with verbose output
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- apps/app/app/utils/auth.server.test.ts
```

#### E2E tests timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 60000  // 60 seconds

# Run in headed mode to debug
npx playwright test --headed

# Use Playwright UI mode
npm run test:e2e
```

### Debug Logging

```typescript
// Enable Prisma query logging
// packages/prisma/index.ts
const client = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
})

client.$on('query', (e) => {
  console.log('Query:', e.query)
  console.log('Duration:', e.duration + 'ms')
})
```

```typescript
// Debug route loader/action
export async function loader({ request, params }: Route.LoaderArgs) {
  console.log('Loader called:', { params, url: request.url })

  const userId = await getUserId(request)
  console.log('User ID:', userId)

  // ...
}
```

### Performance Issues

```bash
# Analyze bundle size
npm run build
npx vite-bundle-visualizer

# Profile database queries
# Enable slow query logging in packages/prisma/index.ts

# Check Nx cache
npx nx show projects --with-target=build
npx nx reset  # Clear cache if stale
```

### Environment Issues

```bash
# Verify environment variables
node -e "console.log(process.env.SESSION_SECRET)"

# Check Node/npm versions
node --version  # Should be 22.x
npm --version   # Should be 10.9.0

# Use Volta for version management
volta pin node@22.15.0
volta pin npm@10.9.0
```

---

## Additional Resources

### Documentation

- **Project Docs**: `/docs` directory (84 markdown files)
- **Contributing**: `CONTRIBUTING.md`
- **Security Audit**: `SECURITY_AUDIT_REPORT.md`
- **Agents Guide**: `AGENTS.md` (companion to this file)

### Key External Docs

- [React Router v7](https://reactrouter.com)
- [Prisma](https://prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://radix-ui.com)
- [conform-to](https://conform.guide)
- [Zod](https://zod.dev)

### Community

- [Epic Stack Discussions](https://github.com/epicweb-dev/epic-stack/discussions)
- [KCD Discord](https://kcd.im/discord)

---

## Quick Reference

### Most Common Commands

```bash
npm run dev              # Start all apps
npm run dev:app          # Start main app only
npm run build            # Build all
npm run typecheck        # Type check all
npm run lint:all         # Lint all
npm run test             # Unit tests
npm run test:e2e         # E2E tests (UI mode)
npm run db:studio        # Database UI
npm run db:migrate       # Create migration
npm run format           # Format code
```

### Most Common Imports

```typescript
// React Router
import { Link, useNavigate, Form, useFetcher } from 'react-router'
import { type Route } from './+types/route-name'
import { redirect, data } from 'react-router'

// UI Components
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Icon } from '@repo/ui/icon'
import { cn } from '@repo/ui'

// Database
import { prisma } from '@repo/prisma'

// Auth
import { requireUserId, getUserId } from '#app/utils/auth.server.ts'

// Validation
import { z } from 'zod'
import { parseWithZod } from '@conform-to/zod'
import { useForm } from '@conform-to/react'

// Utilities
import { invariantResponse } from '@epic-web/invariant'
import { cachified } from '@epic-web/cachified'
```

### Most Common Patterns

```typescript
// Route with loader + action
export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const data = await prisma.model.findMany({ where: { userId } })
  return { data }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submission = await parseWithZod(formData, { schema })

  if (submission.status !== 'success') {
    return data({ result: submission.reply() }, { status: 400 })
  }

  await prisma.model.create({ data: submission.value })
  return redirect('/success')
}

export default function Route({ loaderData, actionData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema })
    },
  })

  return (
    <Form method="post" {...form.props}>
      <Input {...fields.name.props} label="Name" />
      <Button type="submit">Submit</Button>
    </Form>
  )
}
```

---

**Last Updated**: 2025-11-18
**For**: AI Assistants (Claude, etc.)
**Companion File**: AGENTS.md
