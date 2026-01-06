/**
 * Token utilities for MCP OAuth
 * Provides cryptographically secure token generation and hashing
 */

import crypto from 'node:crypto'

/**
 * Generate a cryptographically secure random token
 * Uses base64url encoding for URL-safe tokens
 */
export function generateToken(bytes: number = 32): string {
	return crypto.randomBytes(bytes).toString('base64url')
}

/**
 * Hash a token for secure storage (SHA-256)
 * Tokens should always be hashed before storing in the database
 */
export function hashToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a pair of tokens (raw and hashed)
 * Useful when you need both the token to send and the hash to store
 */
export function generateTokenPair(bytes: number = 32): {
	token: string
	tokenHash: string
} {
	const token = generateToken(bytes)
	const tokenHash = hashToken(token)
	return { token, tokenHash }
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, tokenHash: string): boolean {
	const computedHash = hashToken(token)
	// Use timing-safe comparison to prevent timing attacks
	return crypto.timingSafeEqual(
		Buffer.from(computedHash, 'hex'),
		Buffer.from(tokenHash, 'hex'),
	)
}

/**
 * Generate a client ID (used for OAuth client identification)
 */
export function generateClientId(): string {
	return generateToken(32)
}
