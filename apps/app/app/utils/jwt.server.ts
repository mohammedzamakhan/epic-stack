import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '#app/utils/db.server.ts'

const JWT_SECRET =
	process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
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
	} catch (error) {
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
