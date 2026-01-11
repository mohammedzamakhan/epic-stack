import { prisma } from '@repo/database'
import { getClientIp } from '@repo/security'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	createAuthorizationCode,
	exchangeAuthorizationCode,
	refreshAccessToken,
	validateAccessToken,
	generateToken,
	hashToken,
	ACCESS_TOKEN_EXPIRATION,
	REFRESH_TOKEN_EXPIRATION,
} from '#app/utils/mcp/oauth.server.ts'
import {
	checkRateLimit,
	RATE_LIMITS,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'

/**
 * Integration tests for rate limiting across MCP OAuth endpoints
 * Tests the complete flow with rate limiting enforcement
 */

describe('MCP OAuth Rate Limiting Integration Tests', () => {
	let testUserId: string
	let testOrgId: string
	let testAuthorizationId: string

	beforeEach(async () => {
		// Clean up test data
		await prisma.rateLimitEntry.deleteMany({})
		await prisma.mCPRefreshToken.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPAuthorization.deleteMany({})

		// Create test user and organization
		const user = await prisma.user.create({
			data: {
				email: `test-${Date.now()}@example.com`,
				username: `testuser${Date.now()}`,
				name: 'Test User',
			},
		})
		testUserId = user.id

		const org = await prisma.organization.create({
			data: {
				name: 'Test Organization',
				slug: `test-org-${Date.now()}`,
			},
		})
		testOrgId = org.id

		// Get or create member role
		let memberRole = await prisma.organizationRole.findUnique({
			where: { name: 'member' },
		})
		if (!memberRole) {
			memberRole = await prisma.organizationRole.create({
				data: {
					name: 'member',
					description: 'Member role',
					level: 3,
				},
			})
		}

		// Add user to organization
		await prisma.userOrganization.create({
			data: {
				userId: testUserId,
				organizationId: testOrgId,
				organizationRoleId: memberRole.id,
				active: true,
			},
		})

		// Create a test authorization
		const auth = await prisma.mCPAuthorization.create({
			data: {
				userId: testUserId,
				organizationId: testOrgId,
				clientName: 'Test Client',
				clientId: generateToken(),
			},
		})
		testAuthorizationId = auth.id
	})

	afterEach(async () => {
		// Clean up test data
		await prisma.rateLimitEntry.deleteMany({})
		await prisma.mCPRefreshToken.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPAuthorization.deleteMany({})
		await prisma.userOrganization.deleteMany({})
		await prisma.user.deleteMany({})
		await prisma.organization.deleteMany({})
	})

	describe('Authorization Endpoint Rate Limiting (10 per hour per user)', () => {
		it('should allow authorization requests within the limit', async () => {
			for (let i = 0; i < 10; i++) {
				const result = await checkRateLimit(
					{ type: 'user', value: testUserId },
					RATE_LIMITS.authorization,
				)
				expect(result.allowed).toBe(true)
			}
		})

		it('should reject authorization requests exceeding the limit', async () => {
			// Make 10 requests (at limit)
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: testUserId },
					RATE_LIMITS.authorization,
				)
			}

			// 11th request should be rejected
			const result = await checkRateLimit(
				{ type: 'user', value: testUserId },
				RATE_LIMITS.authorization,
			)
			expect(result.allowed).toBe(false)
		})

		it('should return proper rate limit response with retry-after header', async () => {
			// Exhaust the limit
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: testUserId },
					RATE_LIMITS.authorization,
				)
			}

			// Get rate limit check result
			const result = await checkRateLimit(
				{ type: 'user', value: testUserId },
				RATE_LIMITS.authorization,
			)

			expect(result.allowed).toBe(false)
			expect(result.resetAt).toBeInstanceOf(Date)
			// Reset time should be approximately now (within 2 seconds)
			const timeDiff = Math.abs(result.resetAt.getTime() - Date.now())
			expect(timeDiff).toBeLessThan(2000)
		})

		it('should isolate rate limits between different users', async () => {
			const user2 = await prisma.user.create({
				data: {
					email: `test2-${Date.now()}@example.com`,
					username: `testuser2${Date.now()}`,
					name: 'Test User 2',
				},
			})

			// User 1 makes 10 requests
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: testUserId },
					RATE_LIMITS.authorization,
				)
			}

			// User 2 should still have full limit
			const result = await checkRateLimit(
				{ type: 'user', value: user2.id },
				RATE_LIMITS.authorization,
			)
			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(9)

			// Clean up
			await prisma.user.delete({ where: { id: user2.id } })
		})
	})

	describe('Token Endpoint Rate Limiting (20 per hour per IP)', () => {
		it('should allow token requests within the limit', async () => {
			const ip = '192.168.1.100'

			for (let i = 0; i < 20; i++) {
				const result = await checkRateLimit(
					{ type: 'ip', value: ip },
					RATE_LIMITS.token,
				)
				expect(result.allowed).toBe(true)
			}
		})

		it('should reject token requests exceeding the limit', async () => {
			const ip = '192.168.1.101'

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

		it('should isolate rate limits between different IPs', async () => {
			const ip1 = '192.168.1.102'
			const ip2 = '192.168.1.103'

			// IP 1 makes 20 requests
			for (let i = 0; i < 20; i++) {
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

		it('should extract client IP from X-Forwarded-For header', () => {
			const request = new Request('http://localhost', {
				headers: {
					'x-forwarded-for': '203.0.113.1, 198.51.100.1',
				},
			})

			const ip = getClientIp(request)
			expect(ip).toBe('203.0.113.1')
		})

		it('should extract client IP from X-Real-IP header', () => {
			const request = new Request('http://localhost', {
				headers: {
					'x-real-ip': '203.0.113.2',
				},
			})

			const ip = getClientIp(request)
			expect(ip).toBe('203.0.113.2')
		})
	})

	describe('Tool Invocation Rate Limiting (1000 per hour per token)', () => {
		it('should allow tool invocations within the limit', async () => {
			const accessToken = generateToken()

			// Test a sample of requests
			for (let i = 0; i < 100; i++) {
				const result = await checkRateLimit(
					{ type: 'token', value: accessToken },
					RATE_LIMITS.toolInvocation,
				)
				expect(result.allowed).toBe(true)
			}
		})

		it('should reject tool invocations exceeding the limit', async () => {
			const accessToken = generateToken()

			// Make 1000 requests (at limit)
			for (let i = 0; i < 1000; i++) {
				await checkRateLimit(
					{ type: 'token', value: accessToken },
					RATE_LIMITS.toolInvocation,
				)
			}

			// 1001st request should be rejected
			const result = await checkRateLimit(
				{ type: 'token', value: accessToken },
				RATE_LIMITS.toolInvocation,
			)
			expect(result.allowed).toBe(false)
		})

		it('should isolate rate limits between different tokens', async () => {
			const token1 = generateToken()
			const token2 = generateToken()

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

		it('should track remaining requests correctly for tool invocations', async () => {
			const accessToken = generateToken()

			const result1 = await checkRateLimit(
				{ type: 'token', value: accessToken },
				RATE_LIMITS.toolInvocation,
			)
			expect(result1.remaining).toBe(999)

			const result2 = await checkRateLimit(
				{ type: 'token', value: accessToken },
				RATE_LIMITS.toolInvocation,
			)
			expect(result2.remaining).toBe(998)

			const result3 = await checkRateLimit(
				{ type: 'token', value: accessToken },
				RATE_LIMITS.toolInvocation,
			)
			expect(result3.remaining).toBe(997)
		})
	})

	describe('Rate Limit Response Format', () => {
		it('should create proper rate limit error response', async () => {
			const resetAt = new Date(Date.now() + 3600000) // 1 hour from now

			const response = createRateLimitResponse(resetAt)

			expect(response.status).toBe(429)
			expect(response.headers.get('Retry-After')).toBeDefined()
			expect(response.headers.get('X-RateLimit-Reset')).toBe(
				resetAt.toISOString(),
			)

			const body = (await response.json()) as {
				error: string
				error_description: string
				retry_after: number
			}
			expect(body.error).toBe('rate_limit_exceeded')
			expect(body.error_description).toBeDefined()
			expect(body.retry_after).toBeGreaterThan(0)
		})

		it('should include correct retry-after value in response', async () => {
			const now = Date.now()
			const resetAt = new Date(now + 1800000) // 30 minutes from now

			const response = createRateLimitResponse(resetAt)
			const body = (await response.json()) as { retry_after: number }

			// retry_after should be approximately 1800 seconds (30 minutes)
			expect(body.retry_after).toBeGreaterThanOrEqual(1799)
			expect(body.retry_after).toBeLessThanOrEqual(1801)
		})
	})

	describe('Rate Limit Window Cleanup', () => {
		it('should clean up old entries outside the window', async () => {
			const userId = testUserId
			const now = Date.now()

			// Create an entry that's outside the window
			await prisma.rateLimitEntry.create({
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

			// Old entry should be deleted, only new entry remains
			count = await prisma.rateLimitEntry.count({
				where: { keyId: `user:${userId}` },
			})
			expect(count).toBe(1)
		})

		it('should preserve entries within the window', async () => {
			const userId = testUserId
			const now = Date.now()

			// Create an entry that's within the window
			await prisma.rateLimitEntry.create({
				data: {
					keyId: `user:${userId}`,
					keyType: 'user',
					keyValue: userId,
					createdAt: new Date(now - 1000), // 1 second ago
				},
			})

			// Make a new request
			await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)

			// Both entries should exist
			const count = await prisma.rateLimitEntry.count({
				where: { keyId: `user:${userId}` },
			})
			expect(count).toBe(2)
		})
	})

	describe('Rate Limit Reset Time Calculation', () => {
		it('should provide correct reset time for authorization limit', async () => {
			const userId = testUserId

			const result = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)

			// Reset time should be a valid Date
			expect(result.resetAt).toBeInstanceOf(Date)
			// Reset time should be approximately now (within 2 seconds)
			const timeDiff = Math.abs(result.resetAt.getTime() - Date.now())
			expect(timeDiff).toBeLessThan(2000)
		})

		it('should provide correct reset time for token limit', async () => {
			const ip = '192.168.1.200'

			const result = await checkRateLimit(
				{ type: 'ip', value: ip },
				RATE_LIMITS.token,
			)

			// Reset time should be a valid Date
			expect(result.resetAt).toBeInstanceOf(Date)
			// Reset time should be approximately now (within 2 seconds)
			const timeDiff = Math.abs(result.resetAt.getTime() - Date.now())
			expect(timeDiff).toBeLessThan(2000)
		})

		it('should provide correct reset time for tool invocation limit', async () => {
			const token = generateToken()

			const result = await checkRateLimit(
				{ type: 'token', value: token },
				RATE_LIMITS.toolInvocation,
			)

			// Reset time should be a valid Date
			expect(result.resetAt).toBeInstanceOf(Date)
			// Reset time should be approximately now (within 2 seconds)
			const timeDiff = Math.abs(result.resetAt.getTime() - Date.now())
			expect(timeDiff).toBeLessThan(2000)
		})
	})

	describe('Rate Limit Remaining Calculation', () => {
		it('should correctly calculate remaining requests for authorization', async () => {
			const userId = testUserId

			for (let i = 0; i < 5; i++) {
				const result = await checkRateLimit(
					{ type: 'user', value: userId },
					RATE_LIMITS.authorization,
				)
				expect(result.remaining).toBe(9 - i)
			}
		})

		it('should correctly calculate remaining requests for token endpoint', async () => {
			const ip = '192.168.1.201'

			for (let i = 0; i < 5; i++) {
				const result = await checkRateLimit(
					{ type: 'ip', value: ip },
					RATE_LIMITS.token,
				)
				expect(result.remaining).toBe(19 - i)
			}
		})

		it('should correctly calculate remaining requests for tool invocations', async () => {
			const token = generateToken()

			for (let i = 0; i < 5; i++) {
				const result = await checkRateLimit(
					{ type: 'token', value: token },
					RATE_LIMITS.toolInvocation,
				)
				expect(result.remaining).toBe(999 - i)
			}
		})

		it('should return 0 remaining when limit is exceeded', async () => {
			const userId = testUserId

			// Exhaust the limit
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: userId },
					RATE_LIMITS.authorization,
				)
			}

			// Next request should show 0 remaining
			const result = await checkRateLimit(
				{ type: 'user', value: userId },
				RATE_LIMITS.authorization,
			)
			expect(result.remaining).toBe(0)
		})
	})

	describe('Cross-Endpoint Rate Limit Isolation', () => {
		it('should not share rate limits between authorization and token endpoints', async () => {
			const userId = testUserId
			const ip = '192.168.1.202'

			// Make 10 authorization requests
			for (let i = 0; i < 10; i++) {
				await checkRateLimit(
					{ type: 'user', value: userId },
					RATE_LIMITS.authorization,
				)
			}

			// Token endpoint should still have full limit
			const tokenResult = await checkRateLimit(
				{ type: 'ip', value: ip },
				RATE_LIMITS.token,
			)
			expect(tokenResult.allowed).toBe(true)
			expect(tokenResult.remaining).toBe(19)
		})

		it('should not share rate limits between token and tool invocation endpoints', async () => {
			const ip = '192.168.1.203'
			const token = generateToken()

			// Make 20 token requests
			for (let i = 0; i < 20; i++) {
				await checkRateLimit({ type: 'ip', value: ip }, RATE_LIMITS.token)
			}

			// Tool invocation endpoint should still have full limit
			const toolResult = await checkRateLimit(
				{ type: 'token', value: token },
				RATE_LIMITS.toolInvocation,
			)
			expect(toolResult.allowed).toBe(true)
			expect(toolResult.remaining).toBe(999)
		})
	})
})
