# Design Document: MCP OAuth Migration

## Overview

This design document outlines the architecture for migrating the Epic Stack MCP
(Model Context Protocol) integration from API key-based authentication to OAuth
2.0 authentication. The current implementation uses a standalone npm package
(`epic-notes-mcp`) that requires users to manually create and configure API
keys. The new OAuth-based approach will integrate the MCP server directly into
the Epic Stack application, providing a more secure and user-friendly
authentication flow.

The migration follows the pattern established by kentcdodds.com, implementing
OAuth 2.0 authorization code flow with Server-Sent Events (SSE) for MCP
transport. This eliminates the need for the separate npm package and provides a
seamless authentication experience leveraging existing user sessions.

### Key Benefits

- **Improved Security**: Short-lived access tokens (1 hour) with automatic
  refresh
- **Better UX**: Browser-based OAuth flow leveraging existing sessions
- **Simplified Architecture**: MCP server integrated into main application
- **Token Management**: Users can view and revoke authorized clients
- **Organization Scoping**: Tokens are scoped to specific organizations

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client                                │
│                  (Claude Desktop, Kiro IDE)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ 1. Initiate OAuth Flow
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Epic Stack Application                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OAuth Authorization Endpoint                             │  │
│  │  /mcp+/authorize                                          │  │
│  │  - Validates user session                                 │  │
│  │  - Displays authorization UI                              │  │
│  │  - Generates authorization code                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                         │
│                         │ 2. Authorization Code                   │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OAuth Token Endpoint                                     │  │
│  │  /mcp+/token                                              │  │
│  │  - Exchanges code for tokens                              │  │
│  │  - Issues access & refresh tokens                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                         │
│                         │ 3. Access Token                         │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MCP Server Endpoint (SSE)                                │  │
│  │  /mcp+/sse                                                │  │
│  │  - Validates access token                                 │  │
│  │  - Establishes SSE connection                             │  │
│  │  - Handles tool invocations                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                         │
│                         │ 4. Tool Execution                       │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MCP Tools Service                                        │  │
│  │  - find_user                                              │  │
│  │  - get_user_notes                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                         │
│                         ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Database (Prisma)                                        │  │
│  │  - MCPAuthorization                                       │  │
│  │  - MCPAccessToken                                         │  │
│  │  - MCPRefreshToken                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### OAuth Flow Sequence

```
MCP Client          Browser          Epic Stack App          Database
    │                  │                    │                    │
    │ 1. Start OAuth   │                    │                    │
    ├─────────────────>│                    │                    │
    │                  │ 2. GET /authorize  │                    │
    │                  ├───────────────────>│                    │
    │                  │                    │ 3. Check session   │
    │                  │                    ├───────────────────>│
    │                  │                    │<───────────────────┤
    │                  │ 4. Show auth UI    │                    │
    │                  │<───────────────────┤                    │
    │                  │ 5. User approves   │                    │
    │                  ├───────────────────>│                    │
    │                  │                    │ 6. Create auth code│
    │                  │                    ├───────────────────>│
    │                  │                    │<───────────────────┤
    │ 7. Redirect with │                    │                    │
    │    auth code     │                    │                    │
    │<─────────────────┤                    │                    │
    │ 8. POST /token   │                    │                    │
    ├────────────────────────────────────────>                   │
    │                  │                    │ 9. Validate code   │
    │                  │                    ├───────────────────>│
    │                  │                    │<───────────────────┤
    │                  │                    │ 10. Create tokens  │
    │                  │                    ├───────────────────>│
    │                  │                    │<───────────────────┤
    │ 11. Return tokens│                    │                    │
    │<────────────────────────────────────────                   │
    │ 12. Connect SSE  │                    │                    │
    ├────────────────────────────────────────>                   │
    │                  │                    │ 13. Validate token │
    │                  │                    ├───────────────────>│
    │                  │                    │<───────────────────┤
    │ 14. SSE stream   │                    │                    │
    │<────────────────────────────────────────                   │
```

## Components and Interfaces

### 1. Database Schema Extensions

New Prisma models to support OAuth-based MCP authentication:

```prisma
// MCP Authorization - represents an authorized MCP client
model MCPAuthorization {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  clientName     String   // e.g., "Claude Desktop", "Kiro IDE"
  clientId       String   @unique // Generated client identifier

  // Status
  isActive       Boolean  @default(true)
  lastUsedAt     DateTime?

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  accessTokens   MCPAccessToken[]
  refreshTokens  MCPRefreshToken[]

  @@index([userId])
  @@index([organizationId])
  @@index([clientId])
  @@index([userId, organizationId])
}

// MCP Access Token - short-lived token for API access
model MCPAccessToken {
  id              String   @id @default(cuid())
  authorizationId String
  tokenHash       String   @unique // SHA-256 hash of the token

  // Expiration
  expiresAt       DateTime

  // Metadata
  ipAddress       String?
  userAgent       String?

  // Timestamps
  createdAt       DateTime @default(now())

  // Relations
  authorization   MCPAuthorization @relation(fields: [authorizationId], references: [id], onDelete: Cascade)

  @@index([authorizationId])
  @@index([tokenHash])
  @@index([expiresAt])
}

// MCP Refresh Token - long-lived token for obtaining new access tokens
model MCPRefreshToken {
  id              String   @id @default(cuid())
  authorizationId String
  tokenHash       String   @unique // SHA-256 hash of the token

  // Status
  revoked         Boolean  @default(false)
  revokedAt       DateTime?

  // Expiration
  expiresAt       DateTime

  // Metadata
  ipAddress       String?
  userAgent       String?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  authorization   MCPAuthorization @relation(fields: [authorizationId], references: [id], onDelete: Cascade)

  @@index([authorizationId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@index([revoked])
}
```

### 2. OAuth Service

Service layer for handling OAuth operations:

```typescript
// app/utils/mcp-oauth.server.ts

import crypto from 'node:crypto'
import { prisma } from '@repo/database'

// Token expiration constants
export const ACCESS_TOKEN_EXPIRATION = 60 * 60 * 1000 // 1 hour
export const REFRESH_TOKEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000 // 30 days
export const AUTHORIZATION_CODE_EXPIRATION = 10 * 60 * 1000 // 10 minutes

// Generate cryptographically secure random token
function generateToken(): string {
	return crypto.randomBytes(32).toString('base64url')
}

// Hash token for storage
function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

// Generate authorization code (stored in memory/cache)
export async function createAuthorizationCode({
	userId,
	organizationId,
	clientName,
}: {
	userId: string
	organizationId: string
	clientName: string
}): Promise<string> {
	const code = generateToken()
	const codeHash = hashToken(code)

	// Store in cache with expiration (using Redis or in-memory cache)
	await cacheAuthorizationCode(codeHash, {
		userId,
		organizationId,
		clientName,
		expiresAt: Date.now() + AUTHORIZATION_CODE_EXPIRATION,
	})

	return code
}

// Exchange authorization code for tokens
export async function exchangeAuthorizationCode(code: string) {
	const codeHash = hashToken(code)
	const authData = await getCachedAuthorizationCode(codeHash)

	if (!authData || authData.expiresAt < Date.now()) {
		return null
	}

	// Delete code to prevent reuse
	await deleteCachedAuthorizationCode(codeHash)

	// Create authorization record
	const authorization = await prisma.mCPAuthorization.create({
		data: {
			userId: authData.userId,
			organizationId: authData.organizationId,
			clientName: authData.clientName,
			clientId: generateToken(),
		},
	})

	// Generate tokens
	const accessToken = generateToken()
	const refreshToken = generateToken()

	// Store hashed tokens
	await Promise.all([
		prisma.mCPAccessToken.create({
			data: {
				authorizationId: authorization.id,
				tokenHash: hashToken(accessToken),
				expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRATION),
			},
		}),
		prisma.mCPRefreshToken.create({
			data: {
				authorizationId: authorization.id,
				tokenHash: hashToken(refreshToken),
				expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION),
			},
		}),
	])

	return {
		access_token: accessToken,
		refresh_token: refreshToken,
		token_type: 'Bearer',
		expires_in: ACCESS_TOKEN_EXPIRATION / 1000,
	}
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
	const tokenHash = hashToken(refreshToken)

	const refreshTokenRecord = await prisma.mCPRefreshToken.findUnique({
		where: { tokenHash },
		include: { authorization: true },
	})

	if (
		!refreshTokenRecord ||
		refreshTokenRecord.revoked ||
		refreshTokenRecord.expiresAt < new Date()
	) {
		return null
	}

	// Generate new access token
	const newAccessToken = generateToken()

	await prisma.mCPAccessToken.create({
		data: {
			authorizationId: refreshTokenRecord.authorizationId,
			tokenHash: hashToken(newAccessToken),
			expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRATION),
		},
	})

	// Update last used
	await prisma.mCPAuthorization.update({
		where: { id: refreshTokenRecord.authorizationId },
		data: { lastUsedAt: new Date() },
	})

	return {
		access_token: newAccessToken,
		token_type: 'Bearer',
		expires_in: ACCESS_TOKEN_EXPIRATION / 1000,
	}
}

// Validate access token
export async function validateAccessToken(accessToken: string) {
	const tokenHash = hashToken(accessToken)

	const accessTokenRecord = await prisma.mCPAccessToken.findUnique({
		where: { tokenHash },
		include: {
			authorization: {
				include: {
					user: true,
					organization: true,
				},
			},
		},
	})

	if (!accessTokenRecord || accessTokenRecord.expiresAt < new Date()) {
		return null
	}

	if (!accessTokenRecord.authorization.isActive) {
		return null
	}

	return {
		user: accessTokenRecord.authorization.user,
		organization: accessTokenRecord.authorization.organization,
		authorizationId: accessTokenRecord.authorization.id,
	}
}

// Revoke authorization (invalidates all tokens)
export async function revokeAuthorization(authorizationId: string) {
	await prisma.mCPAuthorization.update({
		where: { id: authorizationId },
		data: { isActive: false },
	})

	// Revoke all refresh tokens
	await prisma.mCPRefreshToken.updateMany({
		where: { authorizationId },
		data: { revoked: true, revokedAt: new Date() },
	})
}

// Cache helpers (implement with Redis or in-memory cache)
async function cacheAuthorizationCode(codeHash: string, data: any) {
	// Implementation depends on caching strategy
	// Could use Redis, or in-memory Map for development
}

async function getCachedAuthorizationCode(codeHash: string) {
	// Implementation depends on caching strategy
}

async function deleteCachedAuthorizationCode(codeHash: string) {
	// Implementation depends on caching strategy
}
```

### 3. MCP Server Service

Service for handling MCP protocol operations:

```typescript
// app/utils/mcp-server.server.ts

import { type User, type Organization } from '@prisma/client'

export interface MCPContext {
	user: User
	organization: Organization
}

export interface MCPToolRequest {
	method: string
	params: {
		name: string
		arguments?: Record<string, any>
	}
}

export interface MCPToolResponse {
	content: Array<{
		type: 'text' | 'image' | 'resource'
		text?: string
		data?: string
		mimeType?: string
	}>
}

// Tool registry
const tools = new Map<string, MCPTool>()

interface MCPTool {
	name: string
	description: string
	inputSchema: any
	handler: (args: any, context: MCPContext) => Promise<MCPToolResponse>
}

// Register a tool
export function registerTool(tool: MCPTool) {
	tools.set(tool.name, tool)
}

// Get all tool definitions
export function getToolDefinitions() {
	return Array.from(tools.values()).map((tool) => ({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	}))
}

// Execute a tool
export async function executeTool(
	name: string,
	args: any,
	context: MCPContext,
): Promise<MCPToolResponse> {
	const tool = tools.get(name)

	if (!tool) {
		throw new Error(`Tool not found: ${name}`)
	}

	return tool.handler(args, context)
}

// Handle MCP request
export async function handleMCPRequest(
	request: MCPToolRequest,
	context: MCPContext,
) {
	if (request.method === 'tools/list') {
		return {
			tools: getToolDefinitions(),
		}
	}

	if (request.method === 'tools/call') {
		const { name, arguments: args } = request.params
		return executeTool(name, args, context)
	}

	throw new Error(`Unknown method: ${request.method}`)
}
```

### 4. MCP Tools Implementation

Migrate existing tools to new service:

```typescript
// app/utils/mcp-tools.server.ts

import { prisma } from '@repo/database'
import { registerTool } from './mcp-server.server.ts'
import { getSignedGetRequestInfo } from './storage.server.ts'

// Helper to get user image as base64
async function getUserBase64Image(imageObjectKey: string) {
	const { url: signedUrl, headers: signedHeaders } =
		getSignedGetRequestInfo(imageObjectKey)
	const response = await fetch(signedUrl, { headers: signedHeaders })
	const blob = await response.blob()
	const buffer = await blob.arrayBuffer()
	return Buffer.from(buffer).toString('base64')
}

// Register find_user tool
registerTool({
	name: 'find_user',
	description:
		'Search for users in your organization by their name or username',
	inputSchema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query for user name or username',
			},
		},
		required: ['query'],
	},
	handler: async (args, context) => {
		const { query } = args

		const users = await prisma.user.findMany({
			where: {
				organizations: {
					some: {
						organizationId: context.organization.id,
						active: true,
					},
				},
				OR: [{ name: { contains: query } }, { username: { contains: query } }],
			},
			select: {
				name: true,
				username: true,
				image: {
					select: {
						objectKey: true,
					},
				},
			},
			take: 10,
		})

		const content = []
		for (const user of users) {
			content.push({
				type: 'text' as const,
				text: `${user.name} (${user.username})`,
			})

			if (user.image?.objectKey) {
				content.push({
					type: 'image' as const,
					data: await getUserBase64Image(user.image.objectKey),
					mimeType: 'image/png',
				})
			}
		}

		if (!content.length) {
			content.push({
				type: 'text' as const,
				text: 'No users found in your organization',
			})
		}

		return { content }
	},
})

// Register get_user_notes tool
registerTool({
	name: 'get_user_notes',
	description: 'Get the notes for a user in your organization',
	inputSchema: {
		type: 'object',
		properties: {
			username: {
				type: 'string',
				description: 'Username of the user whose notes to retrieve',
			},
		},
		required: ['username'],
	},
	handler: async (args, context) => {
		const { username } = args

		const user = await prisma.user.findFirst({
			where: {
				username,
				organizations: {
					some: {
						organizationId: context.organization.id,
						active: true,
					},
				},
			},
			select: {
				id: true,
				name: true,
				username: true,
			},
		})

		if (!user) {
			return {
				content: [
					{
						type: 'text' as const,
						text: 'User not found in your organization',
					},
				],
			}
		}

		const notes = await prisma.organizationNote.findMany({
			where: {
				organizationId: context.organization.id,
				createdById: user.id,
				OR: [
					{ isPublic: true },
					{ createdById: context.user.id },
					{ noteAccess: { some: { userId: context.user.id } } },
				],
			},
			select: {
				id: true,
				title: true,
				content: true,
				createdAt: true,
				isPublic: true,
			},
			take: 10,
			orderBy: { createdAt: 'desc' },
		})

		if (!notes?.length) {
			return {
				content: [
					{
						type: 'text' as const,
						text: `No accessible notes found for ${user.name}`,
					},
				],
			}
		}

		const content = notes.map((note) => ({
			type: 'text' as const,
			text: `${note.title}\n\n${note.content}\n\n---\nCreated: ${note.createdAt.toLocaleDateString()}${note.isPublic ? '' : ' (Private)'}`,
		}))

		return { content }
	},
})
```

## Data Models

### MCPAuthorization

Represents an authorized MCP client connection.

**Fields:**

- `id`: Unique identifier
- `userId`: User who authorized the client
- `organizationId`: Organization the authorization is scoped to
- `clientName`: Human-readable name (e.g., "Claude Desktop")
- `clientId`: Unique client identifier
- `isActive`: Whether the authorization is active
- `lastUsedAt`: Last time any token was used
- `createdAt`: When authorization was created
- `updatedAt`: Last update timestamp

**Relationships:**

- Belongs to User
- Belongs to Organization
- Has many MCPAccessToken
- Has many MCPRefreshToken

### MCPAccessToken

Short-lived token for API access (1 hour).

**Fields:**

- `id`: Unique identifier
- `authorizationId`: Associated authorization
- `tokenHash`: SHA-256 hash of the token
- `expiresAt`: Expiration timestamp
- `ipAddress`: IP address of the client (optional)
- `userAgent`: User agent string (optional)
- `createdAt`: Creation timestamp

**Relationships:**

- Belongs to MCPAuthorization

### MCPRefreshToken

Long-lived token for obtaining new access tokens (30 days).

**Fields:**

- `id`: Unique identifier
- `authorizationId`: Associated authorization
- `tokenHash`: SHA-256 hash of the token
- `revoked`: Whether the token has been revoked
- `revokedAt`: When the token was revoked
- `expiresAt`: Expiration timestamp
- `ipAddress`: IP address of the client (optional)
- `userAgent`: User agent string (optional)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

**Relationships:**

- Belongs to MCPAuthorization

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all
valid executions of a system-essentially, a formal statement about what the
system should do. Properties serve as the bridge between human-readable
specifications and machine-verifiable correctness guarantees._

### Property Reflection

After reviewing all properties identified in the prework, the following
redundancies were identified:

- **Property 4.3 and 1.5**: Both test that revoking an authorization invalidates
  all tokens. These can be combined into a single comprehensive property.
- **Properties about token expiration (5.1, 5.2)**: These are specific time
  values that should be tested together as part of token generation.
- **Properties about OAuth spec compliance (8.1, 8.2, 8.5)**: These are
  implementation details that can be verified through integration tests rather
  than separate properties.

The remaining properties provide unique validation value and will be included in
the design.

### Property 1: OAuth Flow Initiation

_For any_ MCP client configuration request, the system should initiate an OAuth
authorization flow with a valid redirect URL and state parameter.

**Validates: Requirements 1.1**

### Property 2: Token Issuance Completeness

_For any_ successful OAuth authorization code exchange, the system should issue
both an access token and a refresh token with correct expiration times (1 hour
and 30 days respectively).

**Validates: Requirements 1.2, 5.1, 5.2**

### Property 3: Valid Token Authentication

_For any_ valid, non-expired access token, the system should authenticate the
request and grant access to all authorized tools.

**Validates: Requirements 1.3**

### Property 4: Token Refresh Round Trip

_For any_ expired access token with a valid refresh token, exchanging the
refresh token should produce a new valid access token that grants the same
access as the original.

**Validates: Requirements 1.4**

### Property 5: Authorization Revocation Completeness

_For any_ MCP authorization, when revoked, all associated access tokens and
refresh tokens should become invalid immediately.

**Validates: Requirements 1.5, 4.3**

### Property 6: Session-Based Authorization Redirect

_For any_ OAuth authorization request, the system should redirect to the
authorization page if a session exists, or to the login page if no session
exists.

**Validates: Requirements 2.1, 2.5**

### Property 7: Authorization Approval Code Generation

_For any_ user approval of an authorization request, the system should generate
a unique authorization code and redirect to the client with that code.

**Validates: Requirements 2.3**

### Property 8: Authorization Denial Error Response

_For any_ user denial of an authorization request, the system should redirect to
the client with a standard OAuth error code.

**Validates: Requirements 2.4**

### Property 9: SSE Connection Persistence

_For any_ MCP client that establishes an SSE connection with a valid access
token, the connection should remain open until the client disconnects or the
token expires.

**Validates: Requirements 3.2**

### Property 10: Tool Request Validation and Execution

_For any_ tool invocation request with a valid access token, the system should
validate the token, execute the requested tool, and return results in MCP
protocol format.

**Validates: Requirements 3.3, 3.4**

### Property 11: Connection Resource Cleanup

_For any_ SSE connection that is closed (by client or server), all associated
resources should be freed within a reasonable time period.

**Validates: Requirements 3.5**

### Property 12: Authorization List Completeness

_For any_ user viewing the MCP settings page, the displayed list should contain
all and only the authorizations belonging to that user.

**Validates: Requirements 4.1**

### Property 13: Authorization Display Fields

_For any_ authorization displayed in the settings page, the record should
include client name, authorization date, and last used date fields.

**Validates: Requirements 4.2**

### Property 14: Revoked Token Rejection

_For any_ access token or refresh token associated with a revoked authorization,
attempts to use the token should be rejected with an authentication error.

**Validates: Requirements 4.4**

### Property 15: Authorization List Growth

_For any_ user authorization list, successfully authorizing a new client should
increase the list size by exactly one.

**Validates: Requirements 4.5**

### Property 16: Token Storage Encryption

_For any_ token stored in the database, the stored value should be a hash (not
plaintext), and the original token should not be recoverable from the database.

**Validates: Requirements 5.3**

### Property 17: Authorization Code Uniqueness and Entropy

_For any_ set of generated authorization codes, all codes should be unique and
have sufficient entropy (at least 256 bits).

**Validates: Requirements 5.4**

### Property 18: Authorization Code Single Use

_For any_ authorization code, after being successfully exchanged for tokens,
subsequent attempts to use the same code should fail.

**Validates: Requirements 5.5**

### Property 19: Organization-Scoped User Search

_For any_ find_user tool invocation, all returned users should belong to the
organization associated with the access token.

**Validates: Requirements 6.2**

### Property 20: Note Retrieval Limits and Ordering

_For any_ get_user_notes tool invocation, the system should return at most 10
notes, ordered by creation date (most recent first).

**Validates: Requirements 6.3**

### Property 21: Organization Access Control

_For any_ tool invocation, the system should only return data from the
organization associated with the access token, regardless of what the user
requests.

**Validates: Requirements 6.4**

### Property 22: Tool Error Format Compliance

_For any_ tool execution that fails, the error response should conform to the
MCP protocol format with a descriptive error message.

**Validates: Requirements 6.5**

### Property 23: API Key Deprecation Logging

_For any_ request using an API key (if backward compatibility is maintained),
the system should log a deprecation warning.

**Validates: Requirements 7.4**

### Property 24: Token Response Structure

_For any_ successful token endpoint response, the JSON should include
token_type, access_token, refresh_token, and expires_in fields.

**Validates: Requirements 8.3**

### Property 25: OAuth Error Code Standards

_For any_ error during the OAuth flow, the error response should use standard
OAuth 2.0 error codes (invalid_request, invalid_grant, etc.).

**Validates: Requirements 8.4**

### Property 26: Organization Selection Requirement

_For any_ authorization request, the flow should require organization selection
before issuing tokens.

**Validates: Requirements 9.1**

### Property 27: Token-Organization Association

_For any_ issued access token or refresh token, the token should be associated
with exactly one organization.

**Validates: Requirements 9.2**

### Property 28: Cross-Organization Access Prevention

_For any_ tool invocation, attempting to access data from an organization
different from the token's associated organization should fail with an
authorization error.

**Validates: Requirements 9.3**

### Property 29: Organization Access Revocation Cascade

_For any_ user who loses access to an organization, all MCP tokens associated
with that user-organization pair should be invalidated.

**Validates: Requirements 9.4**

## Error Handling

### OAuth Flow Errors

**Authorization Errors:**

- Missing or invalid client parameters → Return `invalid_request` error
- User denies authorization → Return `access_denied` error
- Invalid redirect URI → Return error to default error page (don't redirect)

**Token Exchange Errors:**

- Invalid authorization code → Return `invalid_grant` error
- Expired authorization code → Return `invalid_grant` error
- Code already used → Return `invalid_grant` error
- Invalid grant type → Return `unsupported_grant_type` error

**Token Refresh Errors:**

- Invalid refresh token → Return `invalid_grant` error
- Expired refresh token → Return `invalid_grant` error
- Revoked refresh token → Return `invalid_grant` error

### MCP Protocol Errors

**Connection Errors:**

- Invalid access token → Close SSE connection with 401 status
- Expired access token → Close SSE connection with 401 status
- Revoked authorization → Close SSE connection with 401 status

**Tool Execution Errors:**

- Unknown tool name → Return MCP error response with descriptive message
- Invalid tool arguments → Return MCP error response with validation details
- Tool execution failure → Return MCP error response with error details
- Database errors → Return MCP error response with generic error message (don't
  expose internals)

### Security Considerations

**Token Security:**

- Store only hashed tokens in database (SHA-256)
- Use cryptographically secure random generation (crypto.randomBytes)
- Implement token rotation on refresh
- Clean up expired tokens periodically

**Rate Limiting:**

- Limit authorization attempts per user (10 per hour)
- Limit token exchange attempts per IP (20 per hour)
- Limit tool invocations per token (1000 per hour)

**Audit Logging:**

- Log all authorization grants and denials
- Log all token issuance and refresh events
- Log all authorization revocations
- Log all failed authentication attempts

## Testing Strategy

### Unit Testing

Unit tests will verify individual components and functions:

**OAuth Service Tests:**

- Token generation produces unique values
- Token hashing is consistent
- Authorization code creation and retrieval
- Token validation logic
- Revocation logic

**MCP Server Service Tests:**

- Tool registration
- Tool execution with mocked context
- Request routing
- Error handling

**MCP Tools Tests:**

- find_user with various queries
- get_user_notes with various usernames
- Access control enforcement
- Error cases (user not found, no notes, etc.)

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using
**fast-check** (JavaScript property testing library):

**Token Properties:**

- Property 2: Token issuance completeness
- Property 4: Token refresh round trip
- Property 16: Token storage encryption
- Property 17: Authorization code uniqueness
- Property 18: Authorization code single use

**Authorization Properties:**

- Property 5: Authorization revocation completeness
- Property 12: Authorization list completeness
- Property 15: Authorization list growth
- Property 29: Organization access revocation cascade

**Tool Execution Properties:**

- Property 10: Tool request validation and execution
- Property 19: Organization-scoped user search
- Property 20: Note retrieval limits and ordering
- Property 21: Organization access control
- Property 28: Cross-organization access prevention

**Protocol Compliance Properties:**

- Property 22: Tool error format compliance
- Property 24: Token response structure
- Property 25: OAuth error code standards

Each property-based test will run a minimum of 100 iterations with randomly
generated inputs to ensure comprehensive coverage.

### Integration Testing

Integration tests will verify end-to-end flows:

**OAuth Flow Integration:**

- Complete authorization code flow
- Token refresh flow
- Authorization revocation flow
- Error scenarios (invalid codes, expired tokens, etc.)

**MCP Protocol Integration:**

- SSE connection establishment
- Tool invocation through SSE
- Connection cleanup
- Error handling through SSE

**Backward Compatibility:**

- API key authentication (if maintained)
- Deprecation warnings
- Migration path verification

### End-to-End Testing

E2E tests using Playwright will verify user-facing flows:

- User authorizes MCP client through browser
- User views authorized clients in settings
- User revokes authorization
- MCP client connects and invokes tools
- Error scenarios from user perspective

## Migration Strategy

### Phase 1: Database Schema Migration

1. Create new Prisma models (MCPAuthorization, MCPAccessToken, MCPRefreshToken)
2. Run database migration
3. Verify schema changes in development

### Phase 2: OAuth Service Implementation

1. Implement OAuth service (mcp-oauth.server.ts)
2. Implement caching layer for authorization codes
3. Add unit tests for OAuth service
4. Add property-based tests for token operations

### Phase 3: MCP Server Implementation

1. Implement MCP server service (mcp-server.server.ts)
2. Migrate existing tools to new service (mcp-tools.server.ts)
3. Add unit tests for MCP server
4. Add property-based tests for tool execution

### Phase 4: Route Implementation

1. Create OAuth routes (/mcp+/authorize, /mcp+/token)
2. Create MCP SSE route (/mcp+/sse)
3. Update MCP settings page UI
4. Add integration tests for routes

### Phase 5: Documentation and Migration

1. Update configuration examples (Claude Desktop, Kiro IDE)
2. Create migration guide for existing users
3. Add deprecation warnings to API key flow (if maintained)
4. Update MCP settings page with new instructions

### Phase 6: Testing and Deployment

1. Run full test suite (unit, property, integration, E2E)
2. Test with real MCP clients (Claude Desktop, Kiro IDE)
3. Deploy to staging environment
4. Verify in production-like environment
5. Deploy to production

### Backward Compatibility

**Option 1: Maintain API Key Support (Recommended for gradual migration)**

- Keep existing API key authentication working
- Add deprecation warnings to logs
- Display migration notice in MCP settings page
- Set sunset date for API key support (e.g., 90 days)

**Option 2: Hard Cutover**

- Remove API key authentication entirely
- Require all users to re-authorize with OAuth
- Provide clear migration instructions
- Offer support for users during transition

## Performance Considerations

### Token Validation

- Cache validated tokens in memory (with TTL matching token expiration)
- Use database indexes on tokenHash fields
- Implement token cleanup job to remove expired tokens

### SSE Connections

- Limit concurrent SSE connections per user (e.g., 10)
- Implement connection pooling
- Monitor memory usage for long-lived connections
- Implement heartbeat to detect dead connections

### Tool Execution

- Reuse existing database query optimizations
- Implement query result caching where appropriate
- Monitor tool execution times
- Add timeout limits for tool execution (e.g., 30 seconds)

## Security Audit Checklist

- [ ] Tokens are never stored in plaintext
- [ ] Authorization codes expire after 10 minutes
- [ ] Access tokens expire after 1 hour
- [ ] Refresh tokens expire after 30 days
- [ ] Revoked tokens are immediately invalid
- [ ] Rate limiting is enforced on all endpoints
- [ ] Audit logs capture all authentication events
- [ ] CORS is properly configured for OAuth endpoints
- [ ] CSRF protection is implemented for authorization flow
- [ ] Token generation uses cryptographically secure randomness
- [ ] Organization access control is enforced on all tool invocations
- [ ] Error messages don't leak sensitive information
- [ ] SSE connections are properly authenticated
- [ ] Connection cleanup prevents resource leaks

## Deployment Checklist

- [ ] Database migration tested in staging
- [ ] All unit tests passing
- [ ] All property-based tests passing (100+ iterations each)
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] OAuth flow tested with Claude Desktop
- [ ] OAuth flow tested with Kiro IDE
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Migration guide published
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
