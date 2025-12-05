import { prisma } from '@repo/database'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	checkRateLimit,
	RATE_LIMITS,
	getClientIp,
} from '#app/utils/rate-limit.server.ts'

describe('Rate Limiting', () => {
	beforeEach(async () => {
		// Clean up rate limit entries before each test
		await prisma.rateLimitEntry.deleteMany({})
	})

	afterEach(async () => {
		// Clean up after each test
		await prisma.rateLimitEntry.deleteMany({})
	})

	describe('Authorization Rate Limit (10 per hour per user)', () => {
		it('should allow requests within the limit', async () => {
			const userId = 'test-user-1'

			for (let i = 0; i < 10; i++) {
				const result = await checkRateLimit(
					{ type: 'user', value: userId },
					RATE_LIMITS.authorization,
				)
				expect(result.allowed).toBe(true)
				expect(result.remaining).toBe(9 - i)
			}
		})

		it('should reject requests exceeding the limit', async () => {
			const userId = 'test-user-2'

			// Make 10 requests (at limit)
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: userId },
					RATE_LIMITS.authorization,
				)
			}

			// 11th request should be rejected
			const result = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)
			expect(result.allowed).toBe(false)
			expect(result.remaining).toBe(0)
		})

		it('should track remaining requests correctly', async () => {
			const userId = 'test-user-3'

			const result1 = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)
			expect(result1.remaining).toBe(9)

			const result2 = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)
			expect(result2.remaining).toBe(8)

			const result3 = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)
			expect(result3.remaining).toBe(7)
		})

		it('should isolate rate limits per user', async () => {
			const user1 = 'test-user-4'
			const user2 = 'test-user-5'

			// User 1 makes 5 requests
			for (let i = 0; i < 5; i++) {
				await checkRateLimit(
					{ type: 'user', value: user1 },
					RATE_LIMITS.authorization,
				)
			}

			// User 2 should still have full limit
			const result = await checkRateLimit(
				{ type: 'user', value: user2 },
				RATE_LIMITS.authorization,
			)
			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(9)
		})
	})

	describe('Token Rate Limit (20 per hour per IP)', () => {
		it('should allow requests within the limit', async () => {
			const ip = '192.168.1.1'

			for (let i = 0; i < 20; i++) {
				const result = await checkRateLimit(
					{ type: 'ip', value: ip },
					RATE_LIMITS.token,
				)
				expect(result.allowed).toBe(true)
				expect(result.remaining).toBe(19 - i)
			}
		})

		it('should reject requests exceeding the limit', async () => {
			const ip = '192.168.1.2'

			// Make 20 requests (at limit)
			for (let i = 0; i < 20; i++) {
				await checkRateLimit({ type: 'ip', value: ip }, RATE_LIMITS.token)
			}

			// 21st request should be rejected
			const result = await checkRateLimit(
				{ type: 'ip', value: ip },
				RATE_LIMITS.token,
			)
			expect(result.allowed).toBe(false)
		})

		it('should isolate rate limits per IP', async () => {
			const ip1 = '192.168.1.3'
			const ip2 = '192.168.1.4'

			// IP 1 makes 15 requests
			for (let i = 0; i < 15; i++) {
				await checkRateLimit({ type: 'ip', value: ip1 }, RATE_LIMITS.token)
			}

			// IP 2 should still have full limit
			const result = await checkRateLimit(
				{ type: 'ip', value: ip2 },
				RATE_LIMITS.token,
			)
			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(19)
		})
	})

	describe('Tool Invocation Rate Limit (1000 per hour per token)', () => {
		it('should allow requests within the limit', async () => {
			const token = 'test-token-1'

			// Test a sample of requests
			for (let i = 0; i < 100; i++) {
				const result = await checkRateLimit(
					{ type: 'token', value: token },
					RATE_LIMITS.toolInvocation,
				)
				expect(result.allowed).toBe(true)
			}
		})

		it('should reject requests exceeding the limit', async () => {
			const token = 'test-token-2'

			// Make 1000 requests (at limit)
			for (let i = 0; i < 1000; i++) {
				await checkRateLimit(
					{ type: 'token', value: token },
					RATE_LIMITS.toolInvocation,
				)
			}

			// 1001st request should be rejected
			const result = await checkRateLimit(
				{ type: 'token', value: token },
				RATE_LIMITS.toolInvocation,
			)
			expect(result.allowed).toBe(false)
		})

		it('should isolate rate limits per token', async () => {
			const token1 = 'test-token-3'
			const token2 = 'test-token-4'

			// Token 1 makes 500 requests
			for (let i = 0; i < 500; i++) {
				await checkRateLimit(
					{ type: 'token', value: token1 },
					RATE_LIMITS.toolInvocation,
				)
			}

			// Token 2 should still have full limit
			const result = await checkRateLimit(
				{ type: 'token', value: token2 },
				RATE_LIMITS.toolInvocation,
			)
			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(999)
		})
	})

	describe('getClientIp', () => {
		it('should extract IP from X-Forwarded-For header', () => {
			const request = new Request('http://localhost', {
				headers: {
					'x-forwarded-for': '203.0.113.1, 198.51.100.1',
				},
			})

			const ip = getClientIp(request)
			expect(ip).toBe('203.0.113.1')
		})

		it('should extract IP from X-Real-IP header', () => {
			const request = new Request('http://localhost', {
				headers: {
					'x-real-ip': '203.0.113.2',
				},
			})

			const ip = getClientIp(request)
			expect(ip).toBe('203.0.113.2')
		})

		it('should return unknown when no IP headers present', () => {
			const request = new Request('http://localhost')

			const ip = getClientIp(request)
			expect(ip).toBe('unknown')
		})

		it('should prefer X-Forwarded-For over X-Real-IP', () => {
			const request = new Request('http://localhost', {
				headers: {
					'x-forwarded-for': '203.0.113.3',
					'x-real-ip': '203.0.113.4',
				},
			})

			const ip = getClientIp(request)
			expect(ip).toBe('203.0.113.3')
		})
	})

	describe('Rate Limit Window Cleanup', () => {
		it('should clean up old entries outside the window', async () => {
			const userId = 'test-user-cleanup'
			const now = Date.now()

			// Create an entry that's outside the window
			const oldEntry = await prisma.rateLimitEntry.create({
				data: {
					keyId: `user:${userId}`,
					keyType: 'user',
					keyValue: userId,
					createdAt: new Date(now - RATE_LIMITS.authorization.windowMs - 1000),
				},
			})

			// Verify old entry exists
			let count = await prisma.rateLimitEntry.count({
				where: { keyId: `user:${userId}` },
			})
			expect(count).toBe(1)

			// Make a new request (should trigger cleanup)
			await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)

			// Old entry should be deleted
			count = await prisma.rateLimitEntry.count({
				where: { keyId: `user:${userId}` },
			})
			expect(count).toBe(1) // Only the new entry
		})
	})

	describe('Rate Limit Reset Time', () => {
		it('should provide correct reset time', async () => {
			const userId = 'test-user-reset'
			const beforeTime = Date.now()

			const result = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)

			const afterTime = Date.now()

			// Reset time should be approximately windowStart + window
			// Since windowStart = now - window, resetAt = (now - window) + window = now
			// So resetAt should be approximately now
			const expectedMin = beforeTime
			const expectedMax = afterTime + 1000 // Allow 1 second buffer

			expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
			expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedMax)
		})
	})
})
