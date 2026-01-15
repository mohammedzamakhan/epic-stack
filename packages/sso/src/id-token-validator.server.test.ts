import { describe, it, expect, beforeEach } from 'vitest'
import * as jose from 'jose'
import {
	decodeIDTokenUnsafe,
	getTokenKeyId,
	clearJWKSCache,
	getJWKSCacheStats,
	IDTokenValidationErrorCode,
} from './id-token-validator.server.ts'

describe('ID Token Validator', () => {
	let privateKey: jose.KeyLike

	beforeEach(async () => {
		// Generate a test key pair
		const keyPair = await jose.generateKeyPair('RS256', { extractable: true })
		privateKey = keyPair.privateKey

		// Clear JWKS cache before each test
		clearJWKSCache()
	})

	describe('decodeIDTokenUnsafe', () => {
		it('should decode a valid JWT without verification', async () => {
			const token = await new jose.SignJWT({
				sub: 'user-123',
				email: 'user@example.com',
				email_verified: true,
				name: 'Test User',
			})
				.setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
				.setIssuer('https://auth.example.com')
				.setAudience('test-client')
				.setIssuedAt()
				.setExpirationTime('1h')
				.sign(privateKey)

			const claims = decodeIDTokenUnsafe(token)

			expect(claims).not.toBeNull()
			expect(claims?.sub).toBe('user-123')
			expect(claims?.email).toBe('user@example.com')
			expect(claims?.email_verified).toBe(true)
			expect(claims?.name).toBe('Test User')
			expect(claims?.iss).toBe('https://auth.example.com')
			expect(claims?.aud).toBe('test-client')
		})

		it('should decode token with multiple audiences', async () => {
			const token = await new jose.SignJWT({
				sub: 'user-123',
			})
				.setProtectedHeader({ alg: 'RS256' })
				.setIssuer('https://auth.example.com')
				.setAudience(['client-1', 'client-2'])
				.setIssuedAt()
				.setExpirationTime('1h')
				.sign(privateKey)

			const claims = decodeIDTokenUnsafe(token)

			expect(claims).not.toBeNull()
			expect(claims?.aud).toEqual(['client-1', 'client-2'])
		})

		it('should decode token with nonce', async () => {
			const nonce = 'random-nonce-value'
			const token = await new jose.SignJWT({
				sub: 'user-123',
				nonce,
			})
				.setProtectedHeader({ alg: 'RS256' })
				.setIssuer('https://auth.example.com')
				.setAudience('test-client')
				.setIssuedAt()
				.setExpirationTime('1h')
				.sign(privateKey)

			const claims = decodeIDTokenUnsafe(token)

			expect(claims).not.toBeNull()
			expect(claims?.nonce).toBe(nonce)
		})

		it('should return null for invalid token', () => {
			const claims = decodeIDTokenUnsafe('not-a-valid-jwt')
			expect(claims).toBeNull()
		})

		it('should return null for malformed token', () => {
			const claims = decodeIDTokenUnsafe('header.payload')
			expect(claims).toBeNull()
		})

		it('should return null for empty string', () => {
			const claims = decodeIDTokenUnsafe('')
			expect(claims).toBeNull()
		})
	})

	describe('getTokenKeyId', () => {
		it('should extract kid from token header', async () => {
			const token = await new jose.SignJWT({ sub: 'user-123' })
				.setProtectedHeader({ alg: 'RS256', kid: 'my-key-id' })
				.sign(privateKey)

			const kid = getTokenKeyId(token)
			expect(kid).toBe('my-key-id')
		})

		it('should return null if no kid in header', async () => {
			const token = await new jose.SignJWT({ sub: 'user-123' })
				.setProtectedHeader({ alg: 'RS256' })
				.sign(privateKey)

			const kid = getTokenKeyId(token)
			expect(kid).toBeNull()
		})

		it('should return null for invalid token', () => {
			const kid = getTokenKeyId('invalid-token')
			expect(kid).toBeNull()
		})

		it('should return null for empty string', () => {
			const kid = getTokenKeyId('')
			expect(kid).toBeNull()
		})
	})

	describe('JWKS cache management', () => {
		it('should clear cache successfully', () => {
			clearJWKSCache()
			const stats = getJWKSCacheStats()
			expect(stats.size).toBe(0)
			expect(stats.keys).toEqual([])
		})

		it('should return cache stats with correct structure', () => {
			const stats = getJWKSCacheStats()
			expect(stats).toHaveProperty('size')
			expect(stats).toHaveProperty('keys')
			expect(typeof stats.size).toBe('number')
			expect(Array.isArray(stats.keys)).toBe(true)
		})
	})

	describe('IDTokenValidationErrorCode', () => {
		it('should have all expected error codes', () => {
			expect(IDTokenValidationErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN')
			expect(IDTokenValidationErrorCode.EXPIRED_TOKEN).toBe('EXPIRED_TOKEN')
			expect(IDTokenValidationErrorCode.INVALID_ISSUER).toBe('INVALID_ISSUER')
			expect(IDTokenValidationErrorCode.INVALID_AUDIENCE).toBe(
				'INVALID_AUDIENCE',
			)
			expect(IDTokenValidationErrorCode.INVALID_NONCE).toBe('INVALID_NONCE')
			expect(IDTokenValidationErrorCode.INVALID_SIGNATURE).toBe(
				'INVALID_SIGNATURE',
			)
			expect(IDTokenValidationErrorCode.JWKS_FETCH_ERROR).toBe(
				'JWKS_FETCH_ERROR',
			)
			expect(IDTokenValidationErrorCode.TOKEN_NOT_YET_VALID).toBe(
				'TOKEN_NOT_YET_VALID',
			)
			expect(IDTokenValidationErrorCode.AUTH_TIME_EXPIRED).toBe(
				'AUTH_TIME_EXPIRED',
			)
			expect(IDTokenValidationErrorCode.MISSING_REQUIRED_CLAIM).toBe(
				'MISSING_REQUIRED_CLAIM',
			)
		})
	})

	describe('Token structure validation', () => {
		it('should handle token with all OIDC claims', async () => {
			const authTime = Math.floor(Date.now() / 1000) - 300 // 5 minutes ago
			const token = await new jose.SignJWT({
				sub: 'user-123',
				email: 'user@example.com',
				email_verified: true,
				name: 'Test User',
				preferred_username: 'testuser',
				given_name: 'Test',
				family_name: 'User',
				picture: 'https://example.com/avatar.jpg',
				auth_time: authTime,
				acr: 'urn:mace:incommon:iap:silver',
				amr: ['pwd', 'mfa'],
				azp: 'authorized-party',
				at_hash: 'access-token-hash',
				c_hash: 'code-hash',
			})
				.setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
				.setIssuer('https://auth.example.com')
				.setAudience('test-client')
				.setIssuedAt()
				.setExpirationTime('1h')
				.sign(privateKey)

			const claims = decodeIDTokenUnsafe(token)

			expect(claims).not.toBeNull()
			expect(claims?.sub).toBe('user-123')
			expect(claims?.email).toBe('user@example.com')
			expect(claims?.email_verified).toBe(true)
			expect(claims?.name).toBe('Test User')
			expect(claims?.preferred_username).toBe('testuser')
			expect(claims?.given_name).toBe('Test')
			expect(claims?.family_name).toBe('User')
			expect(claims?.picture).toBe('https://example.com/avatar.jpg')
			expect(claims?.auth_time).toBe(authTime)
			expect(claims?.acr).toBe('urn:mace:incommon:iap:silver')
			expect(claims?.amr).toEqual(['pwd', 'mfa'])
			expect(claims?.azp).toBe('authorized-party')
			expect(claims?.at_hash).toBe('access-token-hash')
			expect(claims?.c_hash).toBe('code-hash')
		})

		it('should handle minimal token with only required claims', async () => {
			const token = await new jose.SignJWT({
				sub: 'user-123',
			})
				.setProtectedHeader({ alg: 'RS256' })
				.setIssuer('https://auth.example.com')
				.setAudience('test-client')
				.setIssuedAt()
				.setExpirationTime('1h')
				.sign(privateKey)

			const claims = decodeIDTokenUnsafe(token)

			expect(claims).not.toBeNull()
			expect(claims?.sub).toBe('user-123')
			expect(claims?.iss).toBe('https://auth.example.com')
			expect(claims?.aud).toBe('test-client')
			expect(claims?.iat).toBeDefined()
			expect(claims?.exp).toBeDefined()
			expect(claims?.email).toBeUndefined()
		})
	})
})
