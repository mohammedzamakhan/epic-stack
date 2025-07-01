# Epic Stack - Comprehensive Architecture & Best Practices Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Project Structure](#architecture--project-structure)
3. [Form Management](#form-management)
4. [Authentication & Authorization](#authentication--authorization)
5. [State Management](#state-management)
6. [Database & Data Layer](#database--data-layer)
7. [Server-Client Interaction](#server-client-interaction)
8. [Cookie & Session Management](#cookie--session-management)
9. [Security Best Practices](#security-best-practices)
10. [Performance Optimization](#performance-optimization)
11. [Testing Strategy](#testing-strategy)
12. [Code Conventions](#code-conventions)
13. [Error Handling](#error-handling)
14. [Internationalization](#internationalization)
15. [File Upload & Storage](#file-upload--storage)
16. [Caching Strategy](#caching-strategy)
17. [Development Workflow](#development-workflow)

## Overview

The Epic Stack is a modern, full-stack web application built with React Router
v7 (formerly Remix), featuring a monorepo architecture with TypeScript, Prisma,
SQLite, and comprehensive tooling for production-ready applications.

### Key Technologies

- **Frontend**: React 19, React Router v7, TypeScript
- **Backend**: Node.js, Express, React Router SSR
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS v4, Radix UI components
- **Testing**: Playwright (E2E), Vitest (Unit), MSW (Mocking)
- **Deployment**: Fly.io with LiteFS for SQLite replication
- **Monitoring**: Sentry for error tracking
- **Build**: Vite with custom plugins

## Architecture & Project Structure

### Monorepo Structure

```
epic-stack/
├── apps/
│   ├── web/           # Main web application
│   ├── docs/          # Documentation site
│   ├── email/         # Email service
│   └── studio/        # Database studio
├── packages/
│   ├── prisma/        # Shared database layer
│   ├── ui/            # Shared UI components
│   ├── config/        # Shared configuration
│   └── email/         # Email templates
└── other/             # Build tools and utilities
```

### Best Practices:

1. **Separation of Concerns**: Clear separation between apps and shared packages
2. **Code Reusability**: Shared packages for common functionality
3. **Type Safety**: Full TypeScript coverage across all packages
4. **Consistent Tooling**: Shared ESLint, Prettier, and TypeScript configs

### Route Organization

```typescript
// File-based routing with nested layouts
app/routes/
├── _auth+/           # Authentication routes (grouped)
├── _marketing+/      # Marketing pages (grouped)
├── app+/            # Application routes (grouped)
├── admin+/          # Admin routes (grouped)
└── resources+/      # API/resource routes (grouped)
```

**Best Practices:**

- Use route groups (`+`) for logical organization
- Implement nested layouts for shared UI patterns
- Separate public and authenticated routes clearly
- Use resource routes for API endpoints

## Form Management

### Conform Integration

The application uses [@conform-to/react](https://conform.guide/) for robust form
handling:

```typescript
// Example from login.tsx
const [form, fields] = useForm({
	id: 'login-form',
	constraint: getZodConstraint(LoginFormSchema),
	defaultValue: { redirectTo },
	lastResult: actionData?.result,
	onValidate({ formData }) {
		return parseWithZod(formData, { schema: LoginFormSchema })
	},
	shouldRevalidate: 'onBlur',
})
```

### Best Practices:

1. **Schema-First Validation**: Use Zod schemas for both client and server
   validation
2. **Progressive Enhancement**: Forms work without JavaScript
3. **Real-time Validation**: Client-side validation with server-side fallback
4. **Accessibility**: Proper ARIA attributes and error associations
5. **Type Safety**: Full TypeScript integration with form data

### Form Components Pattern

```typescript
// Reusable form field component
export function Field({
  labelProps,
  inputProps,
  errors,
  className,
}: {
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>
  inputProps: React.InputHTMLAttributes<HTMLInputElement>
  errors?: ListOfErrors
  className?: string
}) {
  const fallbackId = useId()
  const id = inputProps.id ?? fallbackId
  const errorId = errors?.length ? `${id}-error` : undefined

  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <Input
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        {...inputProps}
      />
      <div className="min-h-[32px] px-4 pt-1 pb-3">
        {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
      </div>
    </div>
  )
}
```

### Validation Strategy

```typescript
// Server-side validation with async transforms
const submission = await parseWithZod(formData, {
	schema: LoginFormSchema.transform(async (data, ctx) => {
		if (intent !== null) return { ...data, session: null }

		const session = await login(data)
		if (!session) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid username or password',
			})
			return z.NEVER
		}

		return { ...data, session }
	}),
	async: true,
})
```

## Authentication & Authorization

### Multi-Factor Authentication System

The application implements a comprehensive auth system with:

1. **Username/Password Authentication**
2. **OAuth Integration** (GitHub)
3. **WebAuthn/Passkey Support**
4. **Two-Factor Authentication** (TOTP)
5. **Email Verification**

### Session Management

```typescript
// Session-based authentication with database storage
export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null

	const session = await prisma.session.findUnique({
		select: { userId: true },
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})

	if (!session?.userId) {
		throw redirect('/', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}
	return session.userId
}
```

### Role-Based Access Control (RBAC)

```typescript
// Permission-based authorization
export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					permissions: {
						some: {
							...permissionData,
							access: permissionData.access
								? { in: permissionData.access }
								: undefined,
						},
					},
				},
			},
		},
	})

	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredPermission: permissionData,
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}
```

### Best Practices:

1. **Defense in Depth**: Multiple layers of authentication
2. **Secure Session Storage**: Database-backed sessions with expiration
3. **Password Security**: bcrypt hashing, breach checking via HaveIBeenPwned
4. **Progressive Enhancement**: Works without JavaScript
5. **Modern Standards**: WebAuthn for passwordless authentication

## State Management

### Server-First Architecture

The application follows a server-first approach with minimal client-side state:

1. **Server State**: Managed through React Router loaders and actions
2. **Form State**: Handled by Conform with server validation
3. **UI State**: Local React state for ephemeral UI interactions
4. **Global State**: Minimal use of context for theme and user preferences

### Data Loading Pattern

```typescript
// Loader function for server-side data fetching
export async function loader({ request }: Route.LoaderArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUnique({
						select: {
							id: true,
							name: true,
							username: true,
							image: { select: { objectKey: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null

	return data(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: requestUrl.pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}
```

### Best Practices:

1. **Server-Side Rendering**: Data fetched on server for better performance
2. **Optimistic Updates**: Client-side optimistic updates for better UX
3. **Minimal Client State**: Only UI-specific state on client
4. **Type-Safe Data Flow**: Full TypeScript coverage for data flow

## Database & Data Layer

### Prisma ORM Integration

```typescript
// Centralized database client
import { prisma } from '@repo/prisma'
export { prisma }
```

### Schema Design Best Practices

```prisma
model User {
  id       String  @id @default(cuid())
  email    String  @unique
  username String  @unique
  name     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  image       UserImage?
  password    Password?
  notes       Note[]
  roles       Role[]
  sessions    Session[]
  connections Connection[]
  passkey     Passkey[]
  organizations UserOrganization[]
}

model Note {
  id      String @id @default(cuid())
  title   String
  content String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  ownerId String

  images NoteImage[]

  // Optimized indexes
  @@index([ownerId])
  @@index([ownerId, updatedAt])
}
```

### Best Practices:

1. **Consistent Naming**: Clear, consistent field and table names
2. **Proper Indexing**: Strategic indexes for query performance
3. **Cascade Deletes**: Proper foreign key constraints
4. **Audit Fields**: createdAt/updatedAt on all entities
5. **Type Safety**: Generated types for full type safety

### Migration Strategy

```bash
# Development migrations
npm run db:migrate:dev

# Production deployments
npm run db:migrate:deploy
```

## Server-Client Interaction

### React Router Actions & Loaders

```typescript
// Action for form submissions
export async function action({ request }: Route.ActionArgs) {
	await requireAnonymous(request)
	const formData = await request.formData()
	await checkHoneypot(formData)

	const submission = await parseWithZod(formData, {
		schema: LoginFormSchema.transform(async (data, ctx) => {
			const session = await login(data)
			if (!session) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid username or password',
				})
				return z.NEVER
			}
			return { ...data, session }
		}),
		async: true,
	})

	if (submission.status !== 'success' || !submission.value.session) {
		return data(
			{ result: submission.reply({ hideFields: ['password'] }) },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	return handleNewSession({
		request,
		session: submission.value.session,
		remember: submission.value.remember ?? false,
		redirectTo: submission.value.redirectTo,
	})
}
```

### API Design Patterns

1. **Resource Routes**: Dedicated routes for API endpoints
2. **Type-Safe Responses**: Consistent response shapes
3. **Error Handling**: Structured error responses
4. **Performance**: Server timing headers for monitoring

### Best Practices:

1. **Progressive Enhancement**: All functionality works without JavaScript
2. **Optimistic Updates**: Immediate UI feedback with server confirmation
3. **Error Boundaries**: Graceful error handling at component boundaries
4. **Loading States**: Clear loading indicators for better UX

## Cookie & Session Management

### Session Storage Configuration

```typescript
export const authSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_session',
		sameSite: 'lax', // CSRF protection
		path: '/',
		httpOnly: true, // XSS protection
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})
```

### Toast Notifications

```typescript
export const toastSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_toast',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
})

export async function redirectWithToast(
	url: string,
	toast: ToastInput,
	init?: ResponseInit,
) {
	return redirect(url, {
		...init,
		headers: combineHeaders(init?.headers, await createToastHeaders(toast)),
	})
}
```

### Best Practices:

1. **Security First**: httpOnly, secure, sameSite attributes
2. **Secret Rotation**: Support for multiple secrets for rotation
3. **Expiration Management**: Automatic session cleanup
4. **Flash Messages**: One-time messages via session storage

## Security Best Practices

### Content Security Policy

```typescript
contentSecurity(responseHeaders, {
	crossOriginEmbedderPolicy: false,
	contentSecurityPolicy: {
		reportOnly: true, // Remove when ready to enforce
		directives: {
			fetch: {
				'connect-src': [
					MODE === 'development' ? 'ws:' : undefined,
					process.env.SENTRY_DSN ? '*.sentry.io' : undefined,
					"'self'",
				],
				'font-src': ["'self'"],
				'frame-src': ["'self'"],
				'img-src': ["'self'", 'data:'],
				'script-src': ["'strict-dynamic'", "'self'", `'nonce-${nonce}'`],
				'script-src-attr': [`'nonce-${nonce}'`],
			},
		},
	},
})
```

### Honeypot Protection

```typescript
export const honeypot = new Honeypot({
	validFromFieldName: process.env.NODE_ENV === 'test' ? null : undefined,
	encryptionSeed: process.env.HONEYPOT_SECRET,
})

export async function checkHoneypot(formData: FormData) {
	try {
		await honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			throw new Response('Form not submitted properly', { status: 400 })
		}
		throw error
	}
}
```

### Password Security

```typescript
export async function checkIsCommonPassword(password: string) {
	const [prefix, suffix] = getPasswordHashParts(password)

	try {
		const response = await fetch(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			{ signal: AbortSignal.timeout(1000) },
		)

		if (!response.ok) return false

		const data = await response.text()
		return data.split(/\r?\n/).some((line) => {
			const [hashSuffix] = line.split(':')
			return hashSuffix === suffix
		})
	} catch (error) {
		console.warn('Password check failed', error)
		return false
	}
}
```

### Best Practices:

1. **Defense in Depth**: Multiple security layers
2. **Input Validation**: Server-side validation for all inputs
3. **CSRF Protection**: SameSite cookies and proper form handling
4. **XSS Prevention**: Content Security Policy and output encoding
5. **Rate Limiting**: Protection against brute force attacks

## Performance Optimization

### Caching Strategy

```typescript
// Multi-layer caching with LRU and SQLite
export const lruCache = {
	name: 'app-memory-cache',
	set: (key, value) => {
		const ttl = totalTtl(value?.metadata)
		lru.set(key, value, {
			ttl: ttl === Infinity ? undefined : ttl,
			start: value?.metadata?.createdTime,
		})
		return value
	},
	get: (key) => lru.get(key),
	delete: (key) => lru.delete(key),
} satisfies Cache

export const cache: CachifiedCache = {
	name: 'SQLite cache',
	async get(key) {
		const result = getStatement.get(key)
		// ... parsing and validation
		return { metadata, value }
	},
	async set(key, entry) {
		const value = JSON.stringify(entry.value, bufferReplacer)
		setStatement.run(key, value, JSON.stringify(entry.metadata))
	},
	async delete(key) {
		deleteStatement.run(key)
	},
}
```

### Performance Monitoring

```typescript
// Server timing headers for performance monitoring
export function makeTimings(type: string, desc?: string) {
	const timings: Timings = {
		[type]: [{ desc, start: performance.now() }],
	}
	Object.defineProperty(timings, 'toString', {
		value: function () {
			return getServerTimeHeader(timings)
		},
		enumerable: false,
	})
	return timings
}

export async function time<ReturnType>(
	fn: Promise<ReturnType> | (() => ReturnType | Promise<ReturnType>),
	{
		type,
		desc,
		timings,
	}: {
		type: string
		desc?: string
		timings?: Timings
	},
): Promise<ReturnType> {
	const timer = createTimer(type, desc)
	const promise = typeof fn === 'function' ? fn() : fn
	if (!timings) return promise

	const result = await promise
	timer.end(timings)
	return result
}
```

### Best Practices:

1. **Multi-Layer Caching**: Memory + persistent cache
2. **Performance Monitoring**: Server timing headers
3. **Code Splitting**: Route-based code splitting
4. **Asset Optimization**: Optimized images and assets
5. **Database Optimization**: Proper indexing and query optimization

## Testing Strategy

### End-to-End Testing with Playwright

```typescript
// Comprehensive E2E test example
test('onboarding with link', async ({ page, getOnboardingData }) => {
	const onboardingData = getOnboardingData()

	await page.goto('/')
	await page.getByRole('link', { name: /log in/i }).click()
	await expect(page).toHaveURL(`/login`)

	const createAccountLink = page.getByRole('link', {
		name: /create an account/i,
	})
	await createAccountLink.click()

	await expect(page).toHaveURL(`/signup`)

	const emailTextbox = page.getByRole('textbox', { name: /email/i })
	await emailTextbox.click()
	await emailTextbox.fill(onboardingData.email)

	await page.getByRole('button', { name: /submit/i }).click()
	await expect(page.getByText(/check your email/i)).toBeVisible()

	const email = await readEmail(onboardingData.email)
	invariant(email, 'Email not found')
	expect(email.to).toBe(onboardingData.email.toLowerCase())
	expect(email.from).toBe('hello@epicstack.dev')
	expect(email.subject).toMatch(/welcome/i)

	const onboardingUrl = extractUrl(email.text)
	invariant(onboardingUrl, 'Onboarding URL not found')
	await page.goto(onboardingUrl)

	// Continue with full user flow...
})
```

### Testing Best Practices:

1. **Full User Flows**: Test complete user journeys
2. **Real Email Testing**: Integration with email service
3. **Database Cleanup**: Proper test isolation
4. **Accessibility Testing**: Screen reader and keyboard navigation
5. **Visual Regression**: Screenshot comparisons

### Unit Testing with Vitest

```typescript
// Component and utility testing
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

test('renders error list correctly', () => {
  const errors = ['Error 1', 'Error 2']
  render(<ErrorList errors={errors} />)

  expect(screen.getByText('Error 1')).toBeInTheDocument()
  expect(screen.getByText('Error 2')).toBeInTheDocument()
})
```

## Code Conventions

### TypeScript Configuration

```json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"exactOptionalPropertyTypes": true
	}
}
```

### Import Organization

```typescript
// 1. Node modules
import { useForm } from '@conform-to/react'
import { data, Form } from 'react-router'

// 2. Internal modules with #app alias
import { Field } from '#app/components/forms.tsx'
import { getUserId } from '#app/utils/auth.server.ts'

// 3. Relative imports
import { type Route } from './+types/login.ts'
```

### Naming Conventions

1. **Files**: kebab-case for files, PascalCase for components
2. **Variables**: camelCase for variables and functions
3. **Constants**: UPPER_SNAKE_CASE for constants
4. **Types**: PascalCase for types and interfaces
5. **Database**: snake_case for database fields

### Component Patterns

```typescript
// Consistent component structure
export function ComponentName({
  prop1,
  prop2,
}: {
  prop1: string
  prop2?: number
}) {
  // Hooks at the top
  const [state, setState] = useState()
  const data = useLoaderData<typeof loader>()

  // Event handlers
  function handleClick() {
    // Implementation
  }

  // Early returns for loading/error states
  if (!data) return <Loading />

  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## Error Handling

### Error Boundaries

```typescript
export function GeneralErrorBoundary() {
  return (
    <div className="container mx-auto flex h-full w-full items-center justify-center bg-destructive p-20 text-h2 text-destructive-foreground">
      <p>Something went wrong.</p>
    </div>
  )
}

// Route-level error boundaries
export const ErrorBoundary = GeneralErrorBoundary
```

### Server Error Handling

```typescript
export function handleError(
	error: unknown,
	{ request }: LoaderFunctionArgs | ActionFunctionArgs,
): void {
	if (request.signal.aborted) {
		return
	}

	if (error instanceof Error) {
		console.error(styleText('red', String(error.stack)))
	} else {
		console.error(error)
	}

	Sentry.captureException(error)
}
```

### Best Practices:

1. **Graceful Degradation**: Fallback UI for errors
2. **Error Reporting**: Automatic error reporting to Sentry
3. **User-Friendly Messages**: Clear error messages for users
4. **Error Recovery**: Ways for users to recover from errors

## Internationalization

### Lingui Integration

```typescript
// Locale detection and management
export const linguiServer = {
  async getLocale(request: Request): Promise<string> {
    const localeFromCookie = await localeCookie.parse(
      request.headers.get('Cookie'),
    )
    if (localeFromCookie) return localeFromCookie

    const acceptLanguage = request.headers.get('Accept-Language')
    if (acceptLanguage) {
      const detectedLocale = detectLocale(
        acceptLanguage,
        supportedLocales,
        { fallback: 'en' },
      )
      return detectedLocale
    }

    return 'en'
  },
}

// Usage in components
import { Trans } from '@lingui/macro'

function WelcomeMessage() {
  return <Trans>Welcome to Epic Notes!</Trans>
}
```

### Best Practices:

1. **Automatic Detection**: Browser language detection
2. **Cookie Persistence**: User preference storage
3. **Fallback Strategy**: Graceful fallback to English
4. **Type Safety**: TypeScript integration for translations

## File Upload & Storage

### S3-Compatible Storage

```typescript
export async function uploadProfileImage(
	userId: string,
	file: File | FileUpload,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `users/${userId}/profile-images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key)
}

// Signed URL generation for secure uploads
function getSignedPutRequestInfo(file: File | FileUpload, key: string) {
	const uploadDate = new Date().toISOString()
	const { url, baseHeaders } = getBaseSignedRequestInfo({
		method: 'PUT',
		key,
		contentType: file.type,
		uploadDate,
	})

	return {
		url,
		headers: {
			...baseHeaders,
			'Content-Type': file.type,
			'X-Amz-Meta-Upload-Date': uploadDate,
		},
	}
}
```

### Best Practices:

1. **Secure Uploads**: Signed URLs for direct uploads
2. **File Organization**: Logical file structure in storage
3. **Metadata Storage**: File metadata in database
4. **Image Optimization**: Automatic image processing

## Caching Strategy

### Multi-Layer Caching

```typescript
// LRU cache for hot data
export const lruCache = {
	name: 'app-memory-cache',
	set: (key, value) => {
		const ttl = totalTtl(value?.metadata)
		lru.set(key, value, {
			ttl: ttl === Infinity ? undefined : ttl,
			start: value?.metadata?.createdTime,
		})
		return value
	},
	get: (key) => lru.get(key),
	delete: (key) => lru.delete(key),
}

// SQLite cache for persistence
export const cache: CachifiedCache = {
	name: 'SQLite cache',
	async get(key) {
		const result = getStatement.get(key)
		// Parse and validate cached data
		return parsedData
	},
	async set(key, entry) {
		setStatement.run(
			key,
			JSON.stringify(entry.value),
			JSON.stringify(entry.metadata),
		)
	},
	async delete(key) {
		deleteStatement.run(key)
	},
}
```

### Best Practices:

1. **Layered Approach**: Memory + persistent cache
2. **TTL Management**: Appropriate cache expiration
3. **Cache Invalidation**: Strategic cache clearing
4. **Performance Monitoring**: Cache hit/miss tracking

## Development Workflow

### Environment Management

```typescript
// Type-safe environment variables
const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_PATH: z.string(),
	DATABASE_URL: z.string(),
	SESSION_SECRET: z.string(),
	// ... other environment variables
})

export function init() {
	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)
		throw new Error('Invalid environment variables')
	}
}
```

### Development Scripts

```json
{
	"scripts": {
		"dev": "cross-env NODE_ENV=development MOCKS=true tsx ./index.js",
		"build": "run-s build:*",
		"build:remix": "react-router build",
		"build:server": "tsx ./other/build-server.ts",
		"test": "vitest",
		"test:e2e": "playwright test --ui",
		"typecheck": "react-router typegen && tsc",
		"validate": "run-p \"test -- --run\" lint typecheck test:e2e:run"
	}
}
```

### Best Practices:

1. **Type Safety**: Environment variable validation
2. **Development Mocking**: MSW for API mocking
3. **Hot Reloading**: Fast development feedback
4. **Validation Pipeline**: Pre-commit validation
5. **Consistent Tooling**: Shared configuration across team

## Conclusion

The Epic Stack demonstrates modern web development best practices through:

1. **Type Safety**: Full TypeScript coverage from database to UI
2. **Progressive Enhancement**: Works without JavaScript
3. **Security First**: Multiple layers of security protection
4. **Performance**: Optimized caching and monitoring
5. **Developer Experience**: Excellent tooling and development workflow
6. **Production Ready**: Comprehensive testing and deployment strategy

This architecture provides a solid foundation for building scalable,
maintainable, and secure web applications while maintaining excellent developer
experience and user performance.
