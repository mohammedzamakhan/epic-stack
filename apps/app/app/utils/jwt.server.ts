import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '#app/utils/db.server.ts'

if (!process.env.JWT_SECRET) {
	throw new Error(
		'JWT_SECRET environment variable is required. Please set it in your .env file.',
	)
}

const JWT_SECRET = process.env.JWT_SECRET
const ACCESS_TOKEN_EXPIRES_IN = '15m' // 15 minutes
const REFRESH_TOKEN_BYTES = 48
const REFRESH_TOKEN_EXPIRES_DAYS = 30

export interface JWTPayload {
	sub: string // user ID
	email: string
	username: string
	iat?: number
	exp?: number
}

export interface TokenPair {
	accessToken: string
	refreshToken: string
	expiresIn: number
	expiresAt: Date
}

/**
 * Create a JWT access token
 */
export function createAccessToken(
	payload: Omit<JWTPayload, 'iat' | 'exp'>,
): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: ACCESS_TOKEN_EXPIRES_IN,
		issuer: 'your-app-name',
		audience: 'mobile-app',
	})
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
	try {
		const decoded = jwt.verify(token, JWT_SECRET, {
			issuer: 'your-app-name',
			audience: 'mobile-app',
		}) as JWTPayload
		return decoded
	} catch {
		return null
	}
}

/**
 * Create a refresh token and store it in the database
 */
export async function createRefreshToken(
	userId: string,
	meta: { userAgent?: string; ip?: string },
): Promise<{ token: string; expiresAt: Date }> {
	const token = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
	const tokenHash = await bcrypt.hash(token, 10)
	const expiresAt = new Date(
		Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
	)

	// Store hashed refresh token in database
	await prisma.refreshToken.create({
		data: {
			userId,
			tokenHash,
			userAgent: meta.userAgent,
			ipAddress: meta.ip,
			expiresAt,
		},
	})

	return { token, expiresAt }
}

/**
 * Rotate refresh token (invalidate old, create new)
 */
export async function rotateRefreshToken(
	oldToken: string,
	userId: string,
	meta: { userAgent?: string; ip?: string },
): Promise<{ token: string; expiresAt: Date } | null> {
	// Find all non-revoked tokens for this user
	const tokens = await prisma.refreshToken.findMany({
		where: {
			userId,
			revoked: false,
			expiresAt: { gt: new Date() },
		},
	})

	// Find the matching token by comparing hashes
	for (const row of tokens) {
		const isMatch = await bcrypt.compare(oldToken, row.tokenHash)
		if (isMatch) {
			// Revoke the old token
			await prisma.refreshToken.update({
				where: { id: row.id },
				data: { revoked: true },
			})

			// Create new token
			const { token, expiresAt } = await createRefreshToken(userId, meta)
			return { token, expiresAt }
		}
	}

	return null
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
	const tokens = await prisma.refreshToken.findMany({
		where: {
			revoked: false,
			expiresAt: { gt: new Date() },
		},
	})

	for (const row of tokens) {
		const isMatch = await bcrypt.compare(token, row.tokenHash)
		if (isMatch) {
			await prisma.refreshToken.update({
				where: { id: row.id },
				data: { revoked: true },
			})
			return true
		}
	}

	return false
}

/**
 * Revoke all refresh tokens for a user (useful for logout all devices)
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { userId, revoked: false },
		data: { revoked: true },
	})
}

/**
 * Clean up expired refresh tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
	await prisma.refreshToken.deleteMany({
		where: {
			OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
		},
	})
}

/**
 * Create both access and refresh tokens for a user
 */
export async function createTokenPair(
	user: { id: string; email: string; username: string },
	meta: { userAgent?: string; ip?: string },
): Promise<TokenPair> {
	const accessToken = createAccessToken({
		sub: user.id,
		email: user.email,
		username: user.username,
	})

	const { token: refreshToken, expiresAt } = await createRefreshToken(
		user.id,
		meta,
	)

	return {
		accessToken,
		refreshToken,
		expiresIn: 15 * 60, // 15 minutes in seconds
		expiresAt,
	}
}

/**
 * Middleware helper to extract and verify JWT from Authorization header
 */
export function requireAuth(request: Request): JWTPayload {
	const header = request.headers.get('authorization')

	if (!header) {
		throw new Error('No authorization header')
	}

	// Handle case where multiple Bearer tokens might be present (comma-separated)
	// This can happen if headers are set both as default and per-request
	const firstBearerToken = header.split(',')[0]?.trim()
	if (!firstBearerToken) {
		throw new Error('Invalid authorization header format')
	}

	const [scheme, token] = firstBearerToken.split(' ')

	if (scheme !== 'Bearer' || !token) {
		throw new Error('Invalid authorization header format')
	}

	const payload = verifyAccessToken(token)
	if (!payload) {
		throw new Error('Invalid or expired token')
	}

	return payload
}

/**
 * Optional auth - returns payload if valid token, null otherwise
 */
export function optionalAuth(request: Request): JWTPayload | null {
	try {
		return requireAuth(request)
	} catch {
		return null
	}
}

/**
 * Helper function to create an authenticated session response with tokens.
 * Encapsulates the common pattern used across auth routes:
 * 1. Fetch user data
 * 2. Create JWT token pair
 * 3. Handle new device signin notification
 *
 * Reduces code duplication between auth.login, auth.onboarding, and auth.$provider.callback routes.
 *
 * @param userId - The authenticated user's ID
 * @param request - The incoming request (for user-agent, IP, etc.)
 * @returns Promise containing user data and tokens, ready for JSON response
 */
export async function createAuthenticatedSessionResponse(
	userId: string,
	request: Request,
) {
	// Import here to avoid circular dependencies
	const { prisma } = await import('#app/utils/db.server.ts')
	const { handleNewDeviceSignin } = await import(
		'#app/utils/new-device-signin.server.tsx'
	)
	const { getClientIp } = await import('#app/utils/ip-tracking.server.ts')

	// Get user data for the response
	const user = await prisma.user.findUnique({
		select: {
			id: true,
			email: true,
			username: true,
			name: true,
			image: { select: { id: true } },
			createdAt: true,
			updatedAt: true,
		},
		where: { id: userId },
	})

	if (!user) {
		return {
			success: false as const,
			error: 'user_not_found' as const,
			message: 'User not found',
		}
	}

	// Create JWT tokens for mobile authentication
	const userAgent = request.headers.get('user-agent') ?? undefined
	const ip = getClientIp(request)

	const tokens = await createTokenPair(
		{
			id: user.id,
			email: user.email,
			username: user.username,
		},
		{ userAgent, ip },
	)

	// Check for new device and send notification email (don't await)
	void handleNewDeviceSignin({
		userId: user.id,
		request,
	})

	return {
		success: true as const,
		data: {
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				name: user.name,
				image: user.image?.id,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt.toISOString(),
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresIn: tokens.expiresIn,
			expiresAt: tokens.expiresAt.toISOString(),
		},
	}
}
