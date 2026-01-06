import crypto from 'node:crypto'
import { prisma } from '@repo/database'

// Token expiration constants
export const ACCESS_TOKEN_EXPIRATION = 60 * 60 * 1000 // 1 hour
export const REFRESH_TOKEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000 // 30 days
export const AUTHORIZATION_CODE_EXPIRATION = 10 * 60 * 1000 // 10 minutes

// In-memory cache for authorization codes (in production, use Redis)
const authorizationCodeCache = new Map<
	string,
	{
		userId: string
		organizationId: string
		clientName: string
		expiresAt: number
		codeChallenge?: string
		codeChallengeMethod?: string
	}
>()

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

// Generate authorization code (stored in memory/cache)
export async function createAuthorizationCode({
	userId,
	organizationId,
	clientName,
	codeChallenge,
	codeChallengeMethod,
}: {
	userId: string
	organizationId: string
	clientName: string
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
		expiresAt: Date.now() + AUTHORIZATION_CODE_EXPIRATION,
		codeChallenge,
		codeChallengeMethod,
	})

	return code
}

// Exchange authorization code for tokens
export async function exchangeAuthorizationCode(
	code: string,
	codeVerifier?: string,
) {
	const codeHash = hashToken(code)
	const authData = authorizationCodeCache.get(codeHash)

	if (!authData || authData.expiresAt < Date.now()) {
		return null
	}

	// Verify PKCE if code challenge was provided
	if (authData.codeChallenge) {
		if (!codeVerifier) {
			return null // code_verifier required but not provided
		}

		// Verify the code_verifier against the code_challenge
		if (authData.codeChallengeMethod === 'S256') {
			const computedChallenge = crypto
				.createHash('sha256')
				.update(codeVerifier)
				.digest('base64url')

			if (computedChallenge !== authData.codeChallenge) {
				return null // PKCE verification failed
			}
		} else if (authData.codeChallengeMethod === 'plain') {
			if (codeVerifier !== authData.codeChallenge) {
				return null // PKCE verification failed
			}
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
