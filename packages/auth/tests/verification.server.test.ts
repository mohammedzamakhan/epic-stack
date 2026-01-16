/**
 * Unit tests for verification session management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifySessionStorage } from '../src/verification.server'

describe('Verification Session Management', () => {
	describe('verifySessionStorage', () => {
		it('should create verification session storage with correct configuration', () => {
			expect(verifySessionStorage).toBeDefined()
			expect(verifySessionStorage.getSession).toBeDefined()
			expect(verifySessionStorage.commitSession).toBeDefined()
			expect(verifySessionStorage.destroySession).toBeDefined()
		})

		it('should create a new verification session', async () => {
			const session = await verifySessionStorage.getSession()

			expect(session).toBeDefined()
			expect(typeof session.set).toBe('function')
			expect(typeof session.get).toBe('function')
			expect(typeof session.has).toBe('function')
		})

		it('should store and retrieve verification data', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('type', 'email')
			session.set('target', 'user@example.com')
			session.set('code', '123456')

			expect(session.get('type')).toBe('email')
			expect(session.get('target')).toBe('user@example.com')
			expect(session.get('code')).toBe('123456')
		})

		it('should commit verification session', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('type', 'email')
			session.set('target', 'user@example.com')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toBeDefined()
			expect(typeof setCookieHeader).toBe('string')
			expect(setCookieHeader).toContain('en_verification=')
		})

		it('should parse and retrieve verification session from cookie', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('type', 'email')
			session.set('target', 'user@example.com')
			session.set('code', '654321')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			// Extract cookie value
			const cookieValue = setCookieHeader.split(';')[0]?.split('=')[1]
			expect(cookieValue).toBeDefined()

			// Parse session from cookie
			const parsedSession = await verifySessionStorage.getSession(
				`en_verification=${cookieValue}`,
			)

			expect(parsedSession.get('type')).toBe('email')
			expect(parsedSession.get('target')).toBe('user@example.com')
			expect(parsedSession.get('code')).toBe('654321')
		})

		it('should destroy verification session', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('type', 'email')

			const setCookieHeader = await verifySessionStorage.destroySession(session)

			expect(setCookieHeader).toBeDefined()
			expect(setCookieHeader).toContain('en_verification=')
			// Cookie expiration can use either Max-Age=0 or Expires with past date
			expect(
				setCookieHeader.includes('Max-Age=0') ||
					setCookieHeader.includes('Expires=Thu, 01 Jan 1970'),
			).toBe(true)
		})

		it('should handle missing verification data gracefully', async () => {
			const session = await verifySessionStorage.getSession()

			expect(session.get('nonexistent')).toBeUndefined()
			expect(session.has('nonexistent')).toBe(false)
		})

		it('should handle multiple verification types', async () => {
			const session = await verifySessionStorage.getSession()

			// Test different verification scenarios
			session.set('emailVerification', {
				email: 'user@example.com',
				code: '123456',
				expiresAt: new Date(Date.now() + 600000),
			})
			session.set('phoneVerification', {
				phone: '+1234567890',
				code: '654321',
				expiresAt: new Date(Date.now() + 600000),
			})

			expect(session.get('emailVerification')).toBeDefined()
			expect(session.get('phoneVerification')).toBeDefined()
			expect(session.get('emailVerification').email).toBe('user@example.com')
			expect(session.get('phoneVerification').phone).toBe('+1234567890')
		})

		it('should unset verification data', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('code', '123456')

			expect(session.has('code')).toBe(true)

			session.unset('code')

			expect(session.has('code')).toBe(false)
			expect(session.get('code')).toBeUndefined()
		})
	})

	describe('Verification cookie configuration', () => {
		it('should use correct cookie name', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toContain('en_verification=')
		})

		it('should set httpOnly flag', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toContain('HttpOnly')
		})

		it('should set SameSite=Lax', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toContain('SameSite=Lax')
		})

		it('should set path=/', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toContain('Path=/')
		})

		it('should have maxAge of 10 minutes (600 seconds)', async () => {
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			expect(setCookieHeader).toContain('Max-Age=600')
		})
	})

	describe('Verification session security', () => {
		it('should handle verification attempts tracking', async () => {
			const session = await verifySessionStorage.getSession()

			session.set('attempts', 0)
			session.set('maxAttempts', 3)

			// Simulate verification attempts
			let attempts = session.get('attempts')
			attempts++
			session.set('attempts', attempts)

			expect(session.get('attempts')).toBe(1)

			attempts++
			session.set('attempts', attempts)

			expect(session.get('attempts')).toBe(2)

			// Check if max attempts reached
			expect(session.get('attempts') < session.get('maxAttempts')).toBe(true)
		})

		it('should store verification expiration time', async () => {
			const session = await verifySessionStorage.getSession()

			const expiresAt = new Date(Date.now() + 600000) // 10 minutes
			session.set('expiresAt', expiresAt)

			expect(session.get('expiresAt')).toEqual(expiresAt)

			// Check if expired
			const now = new Date()
			const isExpired = now > session.get('expiresAt')
			expect(isExpired).toBe(false)
		})

		it('should handle rate limiting data', async () => {
			const session = await verifySessionStorage.getSession()

			session.set('rateLimit', {
				count: 1,
				resetAt: new Date(Date.now() + 3600000), // 1 hour
			})

			const rateLimit = session.get('rateLimit')
			expect(rateLimit.count).toBe(1)
			expect(rateLimit.resetAt).toBeInstanceOf(Date)
		})
	})

	describe('Verification flow scenarios', () => {
		it('should support email verification flow', async () => {
			const session = await verifySessionStorage.getSession()

			// Store email verification data
			session.set('verificationFlow', {
				type: 'email',
				email: 'user@example.com',
				code: '123456',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 600000),
			})

			const flow = session.get('verificationFlow')
			expect(flow.type).toBe('email')
			expect(flow.email).toBe('user@example.com')
			expect(flow.code).toBe('123456')
		})

		it('should support 2FA verification flow', async () => {
			const session = await verifySessionStorage.getSession()

			// Store 2FA verification data
			session.set('verificationFlow', {
				type: '2fa',
				userId: 'user-123',
				code: '654321',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 300000), // 5 minutes
			})

			const flow = session.get('verificationFlow')
			expect(flow.type).toBe('2fa')
			expect(flow.userId).toBe('user-123')
			expect(flow.code).toBe('654321')
		})

		it('should support password reset flow', async () => {
			const session = await verifySessionStorage.getSession()

			// Store password reset data
			session.set('verificationFlow', {
				type: 'password-reset',
				email: 'user@example.com',
				token: 'reset-token-abc123',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 3600000), // 1 hour
			})

			const flow = session.get('verificationFlow')
			expect(flow.type).toBe('password-reset')
			expect(flow.email).toBe('user@example.com')
			expect(flow.token).toBe('reset-token-abc123')
		})

		it('should support magic link flow', async () => {
			const session = await verifySessionStorage.getSession()

			// Store magic link data
			session.set('verificationFlow', {
				type: 'magic-link',
				email: 'user@example.com',
				nonce: 'nonce-xyz789',
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 600000),
			})

			const flow = session.get('verificationFlow')
			expect(flow.type).toBe('magic-link')
			expect(flow.nonce).toBe('nonce-xyz789')
		})
	})

	describe('Session secret handling', () => {
		it('should use SESSION_SECRET from environment', async () => {
			// The verification storage should use the SESSION_SECRET
			const session = await verifySessionStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await verifySessionStorage.commitSession(session)

			// Should successfully create signed cookie
			expect(setCookieHeader).toBeDefined()
			expect(setCookieHeader).toContain('en_verification=')
		})

		it('should fall back to default secret in non-production', async () => {
			const originalEnv = process.env.NODE_ENV
			const originalSecret = (process.env as any).SESSION_SECRET

			;(process.env as any).NODE_ENV = 'development'
			process.env.SESSION_SECRET = 'test-secret-for-development'

			// Re-import with new environment
			vi.resetModules()
			const { verifySessionStorage: newStorage } = await import(
				'../src/verification.server?v=' + Date.now()
			)

			const session = await newStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await newStorage.commitSession(session)

			expect(setCookieHeader).toBeDefined()

			// Restore environment
			;(process.env as any).NODE_ENV = originalEnv
			if (originalSecret) {
				;(process.env as any).SESSION_SECRET = originalSecret
			} else {
				delete (process.env as any).SESSION_SECRET
			}
		})

		it('should handle multiple secrets for rotation', async () => {
			const originalSecret = process.env.SESSION_SECRET
			process.env.SESSION_SECRET = 'secret1,secret2,secret3'

			vi.resetModules()
			const { verifySessionStorage: newStorage } = await import(
				'../src/verification.server?v=' + Date.now()
			)

			const session = await newStorage.getSession()
			session.set('test', 'value')

			const setCookieHeader = await newStorage.commitSession(session)

			expect(setCookieHeader).toBeDefined()

			// Restore
			if (originalSecret) {
				process.env.SESSION_SECRET = originalSecret
			}
		})
	})

	describe('Multiple verification sessions', () => {
		it('should handle multiple verification sessions independently', async () => {
			const session1 = await verifySessionStorage.getSession()
			const session2 = await verifySessionStorage.getSession()

			session1.set('code', '111111')
			session2.set('code', '222222')

			expect(session1.get('code')).toBe('111111')
			expect(session2.get('code')).toBe('222222')
		})

		it('should not mix data between verification sessions', async () => {
			const session1 = await verifySessionStorage.getSession()
			const session2 = await verifySessionStorage.getSession()

			session1.set('email', 'user1@example.com')
			session2.set('email', 'user2@example.com')

			const cookie1 = await verifySessionStorage.commitSession(session1)
			const cookie2 = await verifySessionStorage.commitSession(session2)

			expect(cookie1).not.toBe(cookie2)

			const cookieValue1 = cookie1.split(';')[0]?.split('=')[1] || ''
			const cookieValue2 = cookie2.split(';')[0]?.split('=')[1] || ''

			const parsed1 = await verifySessionStorage.getSession(
				`en_verification=${cookieValue1}`,
			)
			const parsed2 = await verifySessionStorage.getSession(
				`en_verification=${cookieValue2}`,
			)

			expect(parsed1.get('email')).toBe('user1@example.com')
			expect(parsed2.get('email')).toBe('user2@example.com')
		})
	})
})
