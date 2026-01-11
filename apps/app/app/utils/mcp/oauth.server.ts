import crypto from 'node:crypto'
import { prisma } from '@repo/database'

// Token expiration constants
export const ACCESS_TOKEN_EXPIRATION = 60 * 60 * 1000 // 1 hour
export const REFRESH_TOKEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000 // 30 days
export const AUTHORIZATION_CODE_EXPIRATION = 10 * 60 * 1000 // 10 minutes

/**
 * Allowed custom protocol schemes for MCP OAuth redirect URIs.
 * These are known MCP client applications (Claude Desktop, Cursor, VSCode, etc.)
 */
const ALLOWED_CUSTOM_SCHEMES = [
	'cursor://',
	'vscode://',
	'vscode-insiders://',
	'claude://',
	'windsurf://',
	'amp://',
]

/**
 * Validates a redirect URI for MCP OAuth authorization flow.
 *
 * This function prevents open redirect attacks by only allowing:
 * 1. Localhost URLs (http://localhost or http://127.0.0.1) for development/testing
 * 2. Known MCP client custom protocol schemes (cursor://, vscode://, etc.)
 *
 * In production, you should also validate against pre-registered redirect URIs
 * stored per-client in the database.
 *
 * @param redirectUri - The redirect URI to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateMCPRedirectUri(redirectUri: string): {
	isValid: boolean
	error?: string
} {
	if (!redirectUri || typeof redirectUri !== 'string') {
		return { isValid: false, error: 'redirect_uri is required' }
	}

	const trimmed = redirectUri.trim()

	// Check for allowed custom protocol schemes (cursor://, vscode://, etc.)
	for (const scheme of ALLOWED_CUSTOM_SCHEMES) {
		if (trimmed.startsWith(scheme)) {
			return { isValid: true }
		}
	}

	// For HTTP(S) URLs, validate the structure
	try {
		const url = new URL(trimmed)

		// Only allow localhost/127.0.0.1 for HTTP(S) redirect URIs
		// This is safe for MCP clients that run local OAuth callback servers
		const isLocalhost =
			url.hostname === 'localhost' || url.hostname === '127.0.0.1'

		if (!isLocalhost) {
			return {
				isValid: false,
				error:
					'redirect_uri must be a localhost URL or a registered MCP client scheme',
			}
		}

		// For localhost, allow http (common for local OAuth callback servers)
		// and https (for development with self-signed certs)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return {
				isValid: false,
				error: 'redirect_uri must use http or https protocol for localhost',
			}
		}

		// Basic path validation - allow OAuth callback paths
		// Only allow safe path characters to prevent URL injection
		if (!/^\/[a-zA-Z0-9\-_./]*$/.test(url.pathname)) {
			return {
				isValid: false,
				error: 'redirect_uri contains invalid path characters',
			}
		}

		return { isValid: true }
	} catch {
		return {
			isValid: false,
			error: 'redirect_uri is not a valid URL',
		}
	}
}

// In-memory cache for authorization codes (in production, use Redis)
// Using a Map with automatic cleanup to prevent memory leaks
const authorizationCodeCache = new Map<
	string,
	{
		userId: string
		organizationId: string
		clientName: string
		redirectUri: string
		expiresAt: number
		codeChallenge?: string
		codeChallengeMethod?: string
	}
>()

// Clean up expired codes every minute with batched deletions
// to prevent blocking the event loop with large caches
setInterval(() => {
	const now = Date.now()
	const toDelete: string[] = []
	for (const [code, entry] of authorizationCodeCache.entries()) {
		if (entry.expiresAt < now) toDelete.push(code)
		if (toDelete.length > 100) break // limit iteration per cleanup cycle
	}
	toDelete.forEach((code) => authorizationCodeCache.delete(code))
}, 60 * 1000).unref() // unref to allow process to exit if this is the only thing keeping it alive

// Generate cryptographically secure random token
export function generateToken(): string {
	return crypto.randomBytes(32).toString('base64url')
}

// Hash token for storage (SHA-256)
export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

// Create authorization with tokens
export async function createAuthorizationWithTokens({
	userId,
	organizationId,
	clientName,
}: {
	userId: string
	organizationId: string
	clientName: string
}) {
	// Generate tokens
	const accessToken = generateToken()
	const refreshToken = generateToken()

	// Create authorization record and tokens in a single transaction
	const authorization = await prisma.mCPAuthorization.create({
		data: {
			userId,
			organizationId,
			clientName,
			clientId: generateToken(),
			accessTokens: {
				create: {
					tokenHash: hashToken(accessToken),
					expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRATION),
				},
			},
			refreshTokens: {
				create: {
					tokenHash: hashToken(refreshToken),
					expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRATION),
				},
			},
		},
	})

	return {
		authorization,
		accessToken,
		refreshToken,
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
	// Use a transaction to ensure atomicity and reduce risk of database corruption
	await prisma.$transaction(async (tx) => {
		await tx.mCPAuthorization.update({
			where: { id: authorizationId },
			data: { isActive: false },
		})

		// Revoke all refresh tokens
		await tx.mCPRefreshToken.updateMany({
			where: { authorizationId },
			data: { revoked: true, revokedAt: new Date() },
		})
	})
}

// Generate authorization code (stored in memory/cache)
export async function createAuthorizationCode({
	userId,
	organizationId,
	clientName,
	redirectUri,
	codeChallenge,
	codeChallengeMethod,
}: {
	userId: string
	organizationId: string
	clientName: string
	redirectUri: string
	codeChallenge?: string
	codeChallengeMethod?: string
}): Promise<string> {
	const code = generateToken()
	const codeHash = hashToken(code)

	// Store in cache with expiration (including PKCE parameters)
	authorizationCodeCache.set(codeHash, {
		userId,
		organizationId,
		clientName,
		redirectUri,
		expiresAt: Date.now() + AUTHORIZATION_CODE_EXPIRATION,
		codeChallenge,
		codeChallengeMethod,
	})

	return code
}

/**
 * Normalize a redirect URI for consistent comparison.
 * Handles trailing slashes and hostname case.
 */
function normalizeRedirectUri(uri: string): string {
	try {
		const url = new URL(uri)
		// Remove trailing slash from pathname unless it's just '/'
		if (url.pathname !== '/' && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.slice(0, -1)
		}
		// Lowercase the host
		url.hostname = url.hostname.toLowerCase()
		return url.toString()
	} catch {
		// If URL parsing fails, return original for strict comparison
		return uri
	}
}

// Exchange authorization code for tokens
export async function exchangeAuthorizationCode(
	code: string,
	redirectUri: string,
	codeVerifier?: string,
) {
	const codeHash = hashToken(code)
	const authData = authorizationCodeCache.get(codeHash)

	if (!authData || authData.expiresAt < Date.now()) {
		return null
	}

	// Verify redirect URI matches (with normalization for consistency)
	if (
		normalizeRedirectUri(authData.redirectUri) !==
		normalizeRedirectUri(redirectUri)
	) {
		return null
	}

	// Verify PKCE if code challenge was provided
	if (authData.codeChallenge) {
		if (!codeVerifier) {
			return null // code_verifier required but not provided
		}

		// Default to 'plain' per RFC 7636 when not specified
		const method = authData.codeChallengeMethod || 'plain'

		// Verify the code_verifier against the code_challenge
		if (method === 'S256') {
			const computedChallenge = crypto
				.createHash('sha256')
				.update(codeVerifier)
				.digest('base64url')

			if (computedChallenge !== authData.codeChallenge) {
				return null // PKCE verification failed
			}
		} else if (method === 'plain') {
			if (codeVerifier !== authData.codeChallenge) {
				return null // PKCE verification failed
			}
		} else {
			return null // Unsupported code_challenge_method
		}
	}

	// Delete code to prevent reuse
	authorizationCodeCache.delete(codeHash)

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
