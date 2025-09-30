import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
	IntegrationEncryptionService,
	integrationEncryption,
	encryptToken,
	decryptToken,
} from '../../src/encryption'
import type { TokenData } from '../../src/types'

const mockEncryptionKey =
	'1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

describe('IntegrationEncryptionService Edge Cases', () => {
	let encryptionService: IntegrationEncryptionService

	beforeEach(() => {
		encryptionService = new IntegrationEncryptionService()
		vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', mockEncryptionKey)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	describe('encryptTokenData edge cases', () => {
		it('should handle very long access tokens', async () => {
			const longToken = 'a'.repeat(10000)
			const tokenData: TokenData = {
				accessToken: longToken,
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe(longToken)
		})

		it('should handle tokens with special characters', async () => {
			const specialToken = 'token!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
			const tokenData: TokenData = {
				accessToken: specialToken,
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe(specialToken)
		})

		it('should handle tokens with unicode characters', async () => {
			const unicodeToken = 'token_😀_世界_🌍'
			const tokenData: TokenData = {
				accessToken: unicodeToken,
				refreshToken: 'refresh_🔑',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe(unicodeToken)
			expect(decrypted.refreshToken).toBe('refresh_🔑')
		})

		it('should handle tokens with newlines and tabs', async () => {
			const tokenWithWhitespace = 'token\nwith\ttabs\rand\r\nspaces'
			const tokenData: TokenData = {
				accessToken: tokenWithWhitespace,
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe(tokenWithWhitespace)
		})

		it('should handle token data with only access token', async () => {
			const tokenData: TokenData = {
				accessToken: 'simple-token',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)

			expect(encrypted.encryptedAccessToken).toBeDefined()
			expect(encrypted.encryptedRefreshToken).toBeUndefined()
			expect(encrypted.expiresAt).toBeUndefined()
			expect(encrypted.scope).toBeUndefined()
		})

		it('should handle token data with all optional fields', async () => {
			const expiresAt = new Date('2025-12-31T23:59:59Z')
			const tokenData: TokenData = {
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
				expiresAt: expiresAt,
				scope: 'read write delete',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe('access-token')
			expect(decrypted.refreshToken).toBe('refresh-token')
			expect(decrypted.expiresAt).toEqual(expiresAt)
			expect(decrypted.scope).toBe('read write delete')
		})

		it('should handle empty string refresh token', async () => {
			const tokenData: TokenData = {
				accessToken: 'access-token',
				refreshToken: '',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)

			expect(encrypted.encryptedRefreshToken).toBeUndefined()
		})

		it('should handle very long scope strings', async () => {
			const longScope = 'scope:' + 'permission '.repeat(1000)
			const tokenData: TokenData = {
				accessToken: 'token',
				scope: longScope,
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.scope).toBe(longScope)
		})

		it('should generate different encrypted values for same token', async () => {
			const tokenData: TokenData = {
				accessToken: 'same-token',
			}

			const encrypted1 = await encryptionService.encryptTokenData(tokenData)
			const encrypted2 = await encryptionService.encryptTokenData(tokenData)

			expect(encrypted1.encryptedAccessToken).not.toBe(
				encrypted2.encryptedAccessToken,
			)

			const decrypted1 = await encryptionService.decryptTokenData(encrypted1)
			const decrypted2 = await encryptionService.decryptTokenData(encrypted2)

			expect(decrypted1.accessToken).toBe('same-token')
			expect(decrypted2.accessToken).toBe('same-token')
		})
	})

	describe('decryptTokenData edge cases', () => {
		it('should fail to decrypt with wrong key', async () => {
			const tokenData: TokenData = {
				accessToken: 'secret-token',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)

			const wrongKey = '0'.repeat(64)
			vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', wrongKey)
			const newService = new IntegrationEncryptionService()

			await expect(newService.decryptTokenData(encrypted)).rejects.toThrow(
				'Failed to decrypt token data',
			)
		})

		it('should fail to decrypt corrupted data', async () => {
			const corruptedData = {
				encryptedAccessToken: 'corrupted-hex-string',
				iv: '',
			}

			await expect(
				encryptionService.decryptTokenData(corruptedData),
			).rejects.toThrow()
		})

		it('should fail to decrypt with truncated encrypted data', async () => {
			const tokenData: TokenData = {
				accessToken: 'test-token',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)

			const truncatedData = {
				...encrypted,
				encryptedAccessToken: encrypted.encryptedAccessToken.substring(0, 10),
			}

			await expect(
				encryptionService.decryptTokenData(truncatedData),
			).rejects.toThrow()
		})

		it('should handle decryption of minimal token data', async () => {
			const tokenData: TokenData = {
				accessToken: 'x',
			}

			const encrypted = await encryptionService.encryptTokenData(tokenData)
			const decrypted = await encryptionService.decryptTokenData(encrypted)

			expect(decrypted.accessToken).toBe('x')
		})
	})

	describe('validateToken edge cases', () => {
		it('should handle token expiring exactly now', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: new Date(),
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.isExpired).toBe(true)
			expect(result.isValid).toBe(false)
			expect(result.expiresIn).toBe(0)
		})

		it('should handle token expiring in exactly 5 minutes', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: new Date(Date.now() + 300000),
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.isValid).toBe(true)
			expect(result.isExpired).toBe(false)
			expect(result.needsRefresh).toBe(true)
			expect(result.expiresIn).toBeLessThanOrEqual(300)
			expect(result.expiresIn).toBeGreaterThanOrEqual(299)
		})

		it('should handle token expiring in exactly 5 minutes + 1 second', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: new Date(Date.now() + 301000),
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.needsRefresh).toBe(false)
		})

		it('should handle token expired 1 year ago', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.isExpired).toBe(true)
			expect(result.isValid).toBe(false)
			expect(result.expiresIn).toBe(0)
		})

		it('should handle token expiring far in future', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.isValid).toBe(true)
			expect(result.isExpired).toBe(false)
			expect(result.needsRefresh).toBe(false)
		})

		it('should handle undefined expiresAt', () => {
			const tokenData: TokenData = {
				accessToken: 'token',
				expiresAt: undefined,
			}

			const result = encryptionService.validateToken(tokenData)

			expect(result.isValid).toBe(true)
			expect(result.isExpired).toBe(false)
			expect(result.needsRefresh).toBe(false)
			expect(result.expiresIn).toBeUndefined()
		})
	})

	describe('generateOAuthState edge cases', () => {
		it('should generate different states for same inputs', () => {
			const states = new Set()
			for (let i = 0; i < 100; i++) {
				const state = encryptionService.generateOAuthState('org-123', 'slack')
				states.add(state)
			}

			expect(states.size).toBe(100)
		})

		it('should handle empty organization ID', () => {
			const state = encryptionService.generateOAuthState('', 'provider')

			expect(state).toBeDefined()
			expect(state.length).toBeGreaterThan(0)

			expect(() => {
				encryptionService.validateOAuthState(state)
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should handle very long organization ID', () => {
			const longOrgId = 'org-' + 'x'.repeat(1000)
			const state = encryptionService.generateOAuthState(longOrgId, 'provider')

			const validated = encryptionService.validateOAuthState(state)
			expect(validated.organizationId).toBe(longOrgId)
		})

		it('should handle special characters in provider name', () => {
			const providerName = 'provider-with-special-chars!@#$%'
			const state = encryptionService.generateOAuthState('org-123', providerName)

			const validated = encryptionService.validateOAuthState(state)
			expect(validated.providerName).toBe(providerName)
		})

		it('should handle unicode in organization ID and provider name', () => {
			const orgId = 'org-世界'
			const providerName = 'provider-🌍'
			const state = encryptionService.generateOAuthState(orgId, providerName)

			const validated = encryptionService.validateOAuthState(state)
			expect(validated.organizationId).toBe(orgId)
			expect(validated.providerName).toBe(providerName)
		})
	})

	describe('validateOAuthState edge cases', () => {
		it('should throw for malformed base64url', () => {
			expect(() => {
				encryptionService.validateOAuthState('not-valid-base64url!!!###')
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should throw for valid base64url but invalid JSON', () => {
			const invalidJson = Buffer.from('not json').toString('base64url')

			expect(() => {
				encryptionService.validateOAuthState(invalidJson)
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should throw for JSON missing organizationId', () => {
			const invalidState = Buffer.from(
				JSON.stringify({
					providerName: 'slack',
					timestamp: Date.now(),
				}),
			).toString('base64url')

			expect(() => {
				encryptionService.validateOAuthState(invalidState)
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should throw for JSON missing providerName', () => {
			const invalidState = Buffer.from(
				JSON.stringify({
					organizationId: 'org-123',
					timestamp: Date.now(),
				}),
			).toString('base64url')

			expect(() => {
				encryptionService.validateOAuthState(invalidState)
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should throw for JSON missing timestamp', () => {
			const invalidState = Buffer.from(
				JSON.stringify({
					organizationId: 'org-123',
					providerName: 'slack',
				}),
			).toString('base64url')

			expect(() => {
				encryptionService.validateOAuthState(invalidState)
			}).toThrow('Invalid or expired OAuth state')
		})

		it('should validate state with custom max age of 1 hour', () => {
			const state = encryptionService.generateOAuthState('org-123', 'slack')
			const maxAge = 60 * 60 * 1000

			const validated = encryptionService.validateOAuthState(state, maxAge)

			expect(validated.organizationId).toBe('org-123')
			expect(validated.providerName).toBe('slack')
		})

		it('should handle state at exact maxAge boundary', async () => {
			const stateData = {
				organizationId: 'org-123',
				providerName: 'slack',
				timestamp: Date.now() - 100,
				nonce: crypto.randomUUID(),
			}
			const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

			expect(() => {
				encryptionService.validateOAuthState(state, 99)
			}).toThrow('Invalid or expired OAuth state')

			const validated = encryptionService.validateOAuthState(state, 101)
			expect(validated.organizationId).toBe('org-123')
		})
	})

	describe('secureCompare edge cases', () => {
		it('should handle empty strings', () => {
			expect(encryptionService.secureCompare('', '')).toBe(true)
		})

		it('should return false for strings of different length', () => {
			expect(encryptionService.secureCompare('short', 'longer-string')).toBe(
				false,
			)
		})

		it('should handle very long identical strings', () => {
			const longString = 'a'.repeat(10000)
			expect(encryptionService.secureCompare(longString, longString)).toBe(true)
		})

		it('should handle strings differing by one character', () => {
			const str1 = 'abcdefghijklmnop'
			const str2 = 'abcdefghijklmnoP'

			expect(encryptionService.secureCompare(str1, str2)).toBe(false)
		})

		it('should handle strings with unicode', () => {
			const str1 = '世界🌍'
			const str2 = '世界🌍'

			expect(encryptionService.secureCompare(str1, str2)).toBe(true)
		})

		it('should handle strings with null bytes', () => {
			const str1 = 'test\0string'
			const str2 = 'test\0string'

			expect(encryptionService.secureCompare(str1, str2)).toBe(true)
		})

		it('should be case sensitive', () => {
			expect(encryptionService.secureCompare('Test', 'test')).toBe(false)
		})

		it('should handle special characters', () => {
			const str1 = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
			const str2 = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'

			expect(encryptionService.secureCompare(str1, str2)).toBe(true)
		})
	})

	describe('utility functions edge cases', () => {
		it('should encrypt and decrypt simple tokens', async () => {
			const token = 'simple-token-123'

			const encrypted = await encryptToken(token)
			const decrypted = await decryptToken(encrypted)

			expect(decrypted).toBe(token)
		})

		it('should handle very long tokens', async () => {
			const longToken = 'jwt.' + 'a'.repeat(5000) + '.signature'

			const encrypted = await encryptToken(longToken)
			const decrypted = await decryptToken(encrypted)

			expect(decrypted).toBe(longToken)
		})

		it('should encrypt and decrypt tokens correctly', async () => {
			const token = 'secret-token-123'

			const encrypted = await encryptToken(token)
			const decrypted = await decryptToken(encrypted)

			expect(encrypted).not.toBe(token)
			expect(decrypted).toBe(token)
		})

		it('should handle tokens with newlines', async () => {
			const tokenWithNewlines = 'line1\nline2\nline3'

			const encrypted = await encryptToken(tokenWithNewlines)
			const decrypted = await decryptToken(encrypted)

			expect(decrypted).toBe(tokenWithNewlines)
		})
	})

	describe('encryption key validation edge cases', () => {
		it('should throw for key that is too short', async () => {
			vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '1234567890')

			const newService = new IntegrationEncryptionService()
			const tokenData: TokenData = { accessToken: 'token' }

			await expect(newService.encryptTokenData(tokenData)).rejects.toThrow(
				'must be exactly 64 hex characters',
			)
		})

		it('should throw for key that is too long', async () => {
			vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '1'.repeat(128))

			const newService = new IntegrationEncryptionService()
			const tokenData: TokenData = { accessToken: 'token' }

			await expect(newService.encryptTokenData(tokenData)).rejects.toThrow(
				'must be exactly 64 hex characters',
			)
		})

		it('should throw for undefined key', async () => {
			vi.unstubAllEnvs()
			delete process.env.INTEGRATION_ENCRYPTION_KEY

			const newService = new IntegrationEncryptionService()
			const tokenData: TokenData = { accessToken: 'token' }

			await expect(newService.encryptTokenData(tokenData)).rejects.toThrow(
				'INTEGRATION_ENCRYPTION_KEY',
			)
		})

		it('should throw for whitespace-only key', async () => {
			vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '   ')

			const newService = new IntegrationEncryptionService()
			const tokenData: TokenData = { accessToken: 'token' }

			await expect(newService.encryptTokenData(tokenData)).rejects.toThrow(
				'INTEGRATION_ENCRYPTION_KEY environment variable cannot be empty or whitespace-only',
			)
		})
	})

	describe('singleton instance', () => {
		it('should export a singleton instance', () => {
			expect(integrationEncryption).toBeInstanceOf(IntegrationEncryptionService)
		})

		it('should be the same instance across imports', async () => {
			const { integrationEncryption: imported } = await import(
				'../../src/encryption'
			)
			expect(integrationEncryption).toBe(imported)
		})
	})
})
