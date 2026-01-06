/**
 * PKCE (Proof Key for Code Exchange) utilities
 * Implements RFC 7636 for enhanced OAuth2 security
 */

import crypto from 'node:crypto'
import { type CodeChallengeMethod } from './types.ts'

/**
 * Generate a PKCE code verifier
 * Per RFC 7636: 43-128 characters from [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
export function generateCodeVerifier(length: number = 64): string {
	// Ensure length is within RFC 7636 bounds
	const safeLength = Math.max(43, Math.min(128, length))
	return crypto
		.randomBytes(safeLength)
		.toString('base64url')
		.slice(0, safeLength)
}

/**
 * Generate a PKCE code challenge from a code verifier
 * Supports both S256 (recommended) and plain methods
 */
export function generateCodeChallenge(
	codeVerifier: string,
	method: CodeChallengeMethod = 'S256',
): string {
	if (method === 'S256') {
		return crypto.createHash('sha256').update(codeVerifier).digest('base64url')
	}
	// Plain method - code challenge = code verifier
	return codeVerifier
}

/**
 * Verify a PKCE code verifier against a code challenge
 */
export function verifyCodeChallenge(
	codeVerifier: string,
	codeChallenge: string,
	method: CodeChallengeMethod = 'S256',
): boolean {
	const computedChallenge = generateCodeChallenge(codeVerifier, method)

	// Use timing-safe comparison when possible
	if (computedChallenge.length !== codeChallenge.length) {
		return false
	}

	try {
		return crypto.timingSafeEqual(
			Buffer.from(computedChallenge),
			Buffer.from(codeChallenge),
		)
	} catch {
		// Fall back to regular comparison if buffers have different lengths
		return computedChallenge === codeChallenge
	}
}

/**
 * Generate a complete PKCE pair (verifier and challenge)
 * Useful for starting an OAuth flow
 */
export function generatePKCEPair(
	method: CodeChallengeMethod = 'S256',
	verifierLength: number = 64,
): {
	codeVerifier: string
	codeChallenge: string
	codeChallengeMethod: CodeChallengeMethod
} {
	const codeVerifier = generateCodeVerifier(verifierLength)
	const codeChallenge = generateCodeChallenge(codeVerifier, method)

	return {
		codeVerifier,
		codeChallenge,
		codeChallengeMethod: method,
	}
}
