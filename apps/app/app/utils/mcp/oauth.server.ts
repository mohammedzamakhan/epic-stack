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
 * Validates redirect URI format (basic security checks).
 * This checks that the URI is well-formed and uses allowed protocols.
 */
function validateRedirectUriFormat(redirectUri: string): {
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

/**
 * Validates a redirect URI for MCP OAuth authorization flow.
 *
 * This function prevents open redirect attacks by:
 * 1. Validating the URI format (localhost or allowed custom schemes)
 * 2. Checking the URI against pre-registered redirect URIs for the client
 *
 * @param redirectUri - The redirect URI to validate
 * @param clientId - The client ID to validate against (optional for backward compatibility)
 * @returns Object with isValid boolean and optional error message
 */
export async function validateMCPRedirectUri(
	redirectUri: string,
	clientId?: string,
): Promise<{
	isValid: boolean
	error?: string
}> {
	// First, validate the basic format
	const formatValidation = validateRedirectUriFormat(redirectUri)
	if (!formatValidation.isValid) {
		return formatValidation
	}

	// If no clientId provided, fall back to format validation only
	// This maintains backward compatibility
	if (!clientId) {
		return { isValid: true }
	}

	// Look up the client registration
	const client = await prisma.mCPClient.findUnique({
		where: { clientId },
		select: { redirectUris: true },
	})

	if (!client) {
		return { isValid: false, error: 'Client not registered' }
	}

	// Parse the stored redirect URIs
	let registeredUris: string[] = []
	try {
		const parsed: unknown = JSON.parse(client.redirectUris)
		if (Array.isArray(parsed)) {
			registeredUris = parsed.filter(
				(uri): uri is string => typeof uri === 'string',
			)
		}
	} catch {
		return { isValid: false, error: 'Invalid client configuration' }
	}

	// Normalize the redirect URI for comparison
	const normalizedRedirectUri = normalizeRedirectUriForComparison(redirectUri)

	// Check if the redirect URI is in the registered list
	const isRegistered = registeredUris.some(
		(uri) => normalizeRedirectUriForComparison(uri) === normalizedRedirectUri,
	)

	if (!isRegistered) {
		return {
			isValid: false,
			error: 'redirect_uri not registered for this client',
		}
	}

	return { isValid: true }
}

/**
 * Normalize a redirect URI for comparison.
 * Handles trailing slashes and hostname case.
 */
function normalizeRedirectUriForComparison(uri: string): string {
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
		// For custom schemes, just normalize case and trailing slashes
		return uri.toLowerCase().replace(/\/+$/, '')
	}
}

/**
 * Synchronous format-only validation for simple checks.
 * Use validateMCPRedirectUri for full validation with client lookup.
 */
export function validateMCPRedirectUriFormat(redirectUri: string): {
	isValid: boolean
	error?: string
} {
	return validateRedirectUriFormat(redirectUri)
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
