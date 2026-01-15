/**
 * OIDC ID Token Validation
 * Implements RFC 7519 (JWT) and OpenID Connect Core 1.0 ID Token validation
 */

import * as jose from 'jose'
import { ssoCache } from './cache.server.ts'
import { ssoConnectionPool } from './connection-pool.server.ts'

export interface IDTokenClaims {
	iss: string // Issuer
	sub: string // Subject (user ID)
	aud: string | string[] // Audience (client ID)
	exp: number // Expiration time
	iat: number // Issued at
	nonce?: string // Nonce for replay protection
	auth_time?: number // Time of authentication
	acr?: string // Authentication Context Class Reference
	amr?: string[] // Authentication Methods References
	azp?: string // Authorized party
	at_hash?: string // Access token hash
	c_hash?: string // Code hash
	email?: string
	email_verified?: boolean
	name?: string
	preferred_username?: string
	given_name?: string
	family_name?: string
	picture?: string
	[key: string]: unknown
}

export interface IDTokenValidationOptions {
	issuer: string
	clientId: string
	nonce?: string
	maxAge?: number // Maximum age in seconds
	clockTolerance?: number // Clock skew tolerance in seconds (default: 60)
}

export interface IDTokenValidationResult {
	valid: boolean
	claims?: IDTokenClaims
	error?: string
	errorCode?: IDTokenValidationErrorCode
}

export enum IDTokenValidationErrorCode {
	INVALID_TOKEN = 'INVALID_TOKEN',
	EXPIRED_TOKEN = 'EXPIRED_TOKEN',
	INVALID_ISSUER = 'INVALID_ISSUER',
	INVALID_AUDIENCE = 'INVALID_AUDIENCE',
	INVALID_NONCE = 'INVALID_NONCE',
	INVALID_SIGNATURE = 'INVALID_SIGNATURE',
	JWKS_FETCH_ERROR = 'JWKS_FETCH_ERROR',
	TOKEN_NOT_YET_VALID = 'TOKEN_NOT_YET_VALID',
	AUTH_TIME_EXPIRED = 'AUTH_TIME_EXPIRED',
	MISSING_REQUIRED_CLAIM = 'MISSING_REQUIRED_CLAIM',
}

// JWKS cache with TTL
interface CachedJWKS {
	jwks: jose.JSONWebKeySet
	timestamp: number
}

const jwksCache = new Map<string, CachedJWKS>()
const JWKS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Fetch JWKS from the identity provider
 */
async function fetchJWKS(jwksUrl: string): Promise<jose.JSONWebKeySet> {
	// Check cache first
	const cached = jwksCache.get(jwksUrl)
	if (cached && Date.now() - cached.timestamp < JWKS_CACHE_TTL) {
		return cached.jwks
	}

	// Also check the SSO cache for endpoints that might have JWKS
	const cachedEndpoints = ssoCache.getEndpoints(jwksUrl)
	if (cachedEndpoints?.jwks) {
		return cachedEndpoints.jwks
	}

	try {
		const response = await ssoConnectionPool.request(jwksUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		})

		if (!response.ok) {
			throw new Error(`JWKS fetch failed: HTTP ${response.status}`)
		}

		const jwks = (await response.json()) as jose.JSONWebKeySet

		// Validate JWKS structure
		if (!jwks.keys || !Array.isArray(jwks.keys)) {
			throw new Error('Invalid JWKS format: missing keys array')
		}

		// Cache the JWKS
		jwksCache.set(jwksUrl, {
			jwks,
			timestamp: Date.now(),
		})

		return jwks
	} catch (error) {
		throw new Error(
			`Failed to fetch JWKS: ${error instanceof Error ? error.message : 'Unknown error'}`,
		)
	}
}

/**
 * Create a JWKS remote key set for token verification
 */
function createRemoteJWKSet(
	jwksUrl: string,
): jose.GetKeyFunction<jose.JWSHeaderParameters, jose.FlattenedJWSInput> {
	return jose.createRemoteJWKSet(new URL(jwksUrl), {
		cacheMaxAge: JWKS_CACHE_TTL,
		cooldownDuration: 30000, // 30 seconds between retries on failure
	})
}

/**
 * Validate an OIDC ID Token
 *
 * Validates:
 * - JWT signature using JWKS
 * - iss (issuer) matches expected issuer
 * - aud (audience) contains client ID
 * - exp (expiration) is in the future
 * - iat (issued at) is in the past
 * - nonce matches if provided
 * - auth_time + max_age if max_age was requested
 */
export async function validateIDToken(
	idToken: string,
	jwksUrl: string,
	options: IDTokenValidationOptions,
): Promise<IDTokenValidationResult> {
	const clockTolerance = options.clockTolerance ?? 60 // Default 60 seconds

	try {
		// Create remote JWKS for verification
		const JWKS = createRemoteJWKSet(jwksUrl)

		// Verify the token signature and decode claims
		const { payload } = await jose.jwtVerify(idToken, JWKS, {
			issuer: options.issuer,
			audience: options.clientId,
			clockTolerance,
		})

		const claims = payload as unknown as IDTokenClaims

		// Validate required claims
		if (!claims.sub) {
			return {
				valid: false,
				error: 'Missing required claim: sub',
				errorCode: IDTokenValidationErrorCode.MISSING_REQUIRED_CLAIM,
			}
		}

		// Validate nonce if provided
		if (options.nonce && claims.nonce !== options.nonce) {
			return {
				valid: false,
				error: 'Nonce mismatch',
				errorCode: IDTokenValidationErrorCode.INVALID_NONCE,
			}
		}

		// Validate auth_time if max_age was requested
		if (options.maxAge !== undefined && claims.auth_time) {
			const maxAuthTime = Math.floor(Date.now() / 1000) - options.maxAge
			if (claims.auth_time < maxAuthTime) {
				return {
					valid: false,
					error: `Authentication too old: auth_time ${claims.auth_time} is before max allowed ${maxAuthTime}`,
					errorCode: IDTokenValidationErrorCode.AUTH_TIME_EXPIRED,
				}
			}
		}

		return {
			valid: true,
			claims,
		}
	} catch (error) {
		if (error instanceof jose.errors.JWTExpired) {
			return {
				valid: false,
				error: 'ID token has expired',
				errorCode: IDTokenValidationErrorCode.EXPIRED_TOKEN,
			}
		}

		if (error instanceof jose.errors.JWTClaimValidationFailed) {
			const message = error.message.toLowerCase()
			if (message.includes('issuer')) {
				return {
					valid: false,
					error: `Invalid issuer: expected ${options.issuer}`,
					errorCode: IDTokenValidationErrorCode.INVALID_ISSUER,
				}
			}
			if (message.includes('audience')) {
				return {
					valid: false,
					error: `Invalid audience: expected ${options.clientId}`,
					errorCode: IDTokenValidationErrorCode.INVALID_AUDIENCE,
				}
			}
			return {
				valid: false,
				error: `Claim validation failed: ${error.message}`,
				errorCode: IDTokenValidationErrorCode.INVALID_TOKEN,
			}
		}

		if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
			return {
				valid: false,
				error: 'ID token signature verification failed',
				errorCode: IDTokenValidationErrorCode.INVALID_SIGNATURE,
			}
		}

		if (error instanceof jose.errors.JOSEError) {
			return {
				valid: false,
				error: `Token validation error: ${error.message}`,
				errorCode: IDTokenValidationErrorCode.INVALID_TOKEN,
			}
		}

		// JWKS fetch errors
		if (error instanceof Error && error.message.includes('JWKS')) {
			return {
				valid: false,
				error: error.message,
				errorCode: IDTokenValidationErrorCode.JWKS_FETCH_ERROR,
			}
		}

		return {
			valid: false,
			error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			errorCode: IDTokenValidationErrorCode.INVALID_TOKEN,
		}
	}
}

/**
 * Decode an ID token without verification (for debugging/logging)
 * WARNING: Do not trust claims from unverified tokens!
 */
export function decodeIDTokenUnsafe(idToken: string): IDTokenClaims | null {
	try {
		const decoded = jose.decodeJwt(idToken)
		return decoded as IDTokenClaims
	} catch {
		return null
	}
}

/**
 * Extract the key ID (kid) from an ID token header
 * Useful for debugging JWKS issues
 */
export function getTokenKeyId(idToken: string): string | null {
	try {
		const header = jose.decodeProtectedHeader(idToken)
		return header.kid ?? null
	} catch {
		return null
	}
}

/**
 * Validate at_hash (access token hash) claim
 * Used to bind the ID token to the access token
 */
export async function validateAccessTokenHash(
	idToken: string,
	accessToken: string,
): Promise<boolean> {
	try {
		const header = jose.decodeProtectedHeader(idToken)
		const claims = jose.decodeJwt(idToken) as IDTokenClaims

		if (!claims.at_hash) {
			// at_hash is optional in some flows
			return true
		}

		// Determine hash algorithm from token algorithm
		const alg = header.alg
		let hashAlg: string
		if (alg?.startsWith('RS') || alg?.startsWith('PS')) {
			const bits = alg.slice(2)
			hashAlg = `SHA-${bits}`
		} else if (alg?.startsWith('ES')) {
			const bits = alg.slice(2)
			hashAlg =
				bits === '256' ? 'SHA-256' : bits === '384' ? 'SHA-384' : 'SHA-512'
		} else {
			hashAlg = 'SHA-256' // Default
		}

		// Calculate access token hash
		const encoder = new TextEncoder()
		const data = encoder.encode(accessToken)
		const hashBuffer = await crypto.subtle.digest(hashAlg, data)
		const hashArray = new Uint8Array(hashBuffer)

		// Take left half and base64url encode
		const leftHalf = hashArray.slice(0, hashArray.length / 2)
		const calculatedHash = jose.base64url.encode(leftHalf)

		return calculatedHash === claims.at_hash
	} catch {
		return false
	}
}

/**
 * Clear the JWKS cache (useful for testing or forced refresh)
 */
export function clearJWKSCache(): void {
	jwksCache.clear()
}

/**
 * Get JWKS cache statistics
 */
export function getJWKSCacheStats(): { size: number; keys: string[] } {
	return {
		size: jwksCache.size,
		keys: Array.from(jwksCache.keys()),
	}
}
