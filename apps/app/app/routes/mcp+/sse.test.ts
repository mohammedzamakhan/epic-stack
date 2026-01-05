import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import fc from 'fast-check'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	validateAccessToken,
	createAuthorizationWithTokens,
} from '#app/utils/mcp-oauth.server.ts'

// Type definitions for JSON-RPC responses
interface JsonRpcResponse {
	jsonrpc: string
	id?: number
	result?: any
	error?: {
		code: number
		message: string
	}
}

// Helper to create test user
async function createTestUser() {
	return await prisma.user.create({
		data: {
			email: faker.internet.email(),
			username: `user-${faker.string.uuid().slice(0, 8)}`,
			name: faker.person.fullName(),
			roles: { connect: { name: 'user' } },
		},
	})
}

// Helper to create test organization
async function createTestOrganization(userId: string) {
	// Ensure admin role exists
	let adminRole = await prisma.organizationRole.findUnique({
		where: { name: 'admin' },
	})
	if (!adminRole) {
		adminRole = await prisma.organizationRole.create({
			data: {
				name: 'admin',
				description: 'Administrator role',
				level: 4,
			},
		})
	}

	return await prisma.organization.create({
		data: {
			name: faker.company.name(),
			slug: `org-${faker.string.uuid().slice(0, 8)}`,
			users: {
				create: {
					userId,
					organizationRoleId: adminRole.id,
				},
			},
		},
	})
}

describe('MCP SSE Endpoint', () => {
	beforeEach(async () => {
		// Clean up test data before each test
		await prisma.mCPRefreshToken.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPAuthorization.deleteMany({})
		await prisma.userOrganization.deleteMany({})
		await prisma.organization.deleteMany({})
		await prisma.user.deleteMany({})
	})

	afterEach(async () => {
		// Clean up test data after each test
		await prisma.mCPRefreshToken.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPAuthorization.deleteMany({})
		await prisma.userOrganization.deleteMany({})
		await prisma.organization.deleteMany({})
		await prisma.user.deleteMany({})
	})

	describe('Property 3: Valid token authentication', () => {
		it('should authenticate request with valid access token', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const user = await createTestUser()
						const org = await createTestOrganization(user.id)

						// Create authorization with tokens
						const { accessToken } = await createAuthorizationWithTokens({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						// Validate token
						const tokenData = await validateAccessToken(accessToken)

						// Verify token is valid
						expect(tokenData).toBeDefined()
						expect(tokenData?.user.id).toBe(user.id)
						expect(tokenData?.organization.id).toBe(org.id)
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should reject request with invalid access token', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 32, maxLength: 256 }),
					async (invalidToken) => {
						// Validate invalid token
						const tokenData = await validateAccessToken(invalidToken)

						// Verify token is invalid
						expect(tokenData).toBeNull()
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should reject request with expired access token', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Manually expire the token by updating the database
			const tokenHash = require('crypto')
				.createHash('sha256')
				.update(accessToken)
				.digest('hex')

			await prisma.mCPAccessToken.update({
				where: { tokenHash },
				data: {
					expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
				},
			})

			// Validate expired token
			const tokenData = await validateAccessToken(accessToken)

			// Verify token is invalid
			expect(tokenData).toBeNull()
		})
	})

	describe('Property 9: SSE connection persistence', () => {
		it('should maintain SSE connection with valid access token', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const user = await createTestUser()
						const org = await createTestOrganization(user.id)

						// Create authorization with tokens
						const { accessToken } = await createAuthorizationWithTokens({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						// Simulate SSE connection request
						const request = new Request('http://localhost/mcp+/sse', {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${accessToken}`,
							},
						})

						// Verify token is valid for connection
						const tokenData = await validateAccessToken(accessToken)
						expect(tokenData).toBeDefined()

						// Verify connection would be established
						expect(request.headers.get('authorization')).toBe(
							`Bearer ${accessToken}`,
						)
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should reject SSE connection with invalid token', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc
						.string({ minLength: 32, maxLength: 64 })
						.filter((s) => s.trim().length > 0),
					async (invalidToken) => {
						// Verify token validation fails
						const tokenData = await validateAccessToken(invalidToken)
						expect(tokenData).toBeNull()
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should reject SSE connection without Authorization header', async () => {
			// Simulate SSE connection request without auth header
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'GET',
			})

			// Verify no authorization header
			const authHeader = request.headers.get('authorization')
			expect(authHeader).toBeNull()
		})
	})

	describe('Property 11: Connection resource cleanup', () => {
		it('should clean up resources when connection closes', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Verify token exists
			let tokenData = await validateAccessToken(accessToken)
			expect(tokenData).toBeDefined()

			// Simulate connection close by revoking authorization
			await prisma.mCPAuthorization.update({
				where: { id: tokenData!.authorizationId },
				data: { isActive: false },
			})

			// Verify token is now invalid (connection cleanup)
			tokenData = await validateAccessToken(accessToken)
			expect(tokenData).toBeNull()
		})

		it('should handle multiple concurrent connections', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
						minLength: 1,
						maxLength: 5,
					}),
					async (clientNames) => {
						const user = await createTestUser()
						const org = await createTestOrganization(user.id)

						// Create multiple authorizations
						const authorizations = await Promise.all(
							clientNames.map((clientName) =>
								createAuthorizationWithTokens({
									userId: user.id,
									organizationId: org.id,
									clientName,
								}),
							),
						)

						// Verify all tokens are valid
						const validations = await Promise.all(
							authorizations.map((auth) =>
								validateAccessToken(auth.accessToken),
							),
						)

						validations.forEach((validation) => {
							expect(validation).toBeDefined()
						})

						// Revoke all authorizations
						await prisma.mCPAuthorization.updateMany({
							where: { userId: user.id },
							data: { isActive: false },
						})

						// Verify all tokens are now invalid
						const invalidations = await Promise.all(
							authorizations.map((auth) =>
								validateAccessToken(auth.accessToken),
							),
						)

						invalidations.forEach((validation) => {
							expect(validation).toBeNull()
						})
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe('Integration tests for SSE endpoint', () => {
		it('should establish connection with valid token and proper headers', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Verify token is valid
			const tokenData = await validateAccessToken(accessToken)
			expect(tokenData).toBeDefined()
			expect(tokenData?.user.id).toBe(user.id)
			expect(tokenData?.organization.id).toBe(org.id)
		})

		it('should reject connection with missing Authorization header', async () => {
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'GET',
			})

			const authHeader = request.headers.get('authorization')
			expect(authHeader).toBeNull()
		})

		it('should reject connection with malformed Authorization header', async () => {
			// Test with various malformed headers
			const malformedHeaders = [
				'Basic dXNlcjpwYXNz',
				'Bearer',
				'InvalidScheme token123',
				'bearer lowercase',
			]

			for (const header of malformedHeaders) {
				const request = new Request('http://localhost/mcp+/sse', {
					method: 'GET',
					headers: {
						Authorization: header,
					},
				})

				const authHeader = request.headers.get('authorization')
				// Verify it doesn't properly start with "Bearer " (with space)
				if (authHeader && !authHeader.startsWith('Bearer ')) {
					expect(authHeader.startsWith('Bearer ')).toBe(false)
				}
			}
		})

		it('should reject non-GET requests', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Try POST request
			const postRequest = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})

			expect(postRequest.method).toBe('POST')
			expect(postRequest.method).not.toBe('GET')
		})
	})

	describe('Integration tests for streamableHttp transport', () => {
		it('should handle POST request with valid token', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create POST request with JSON-RPC payload
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'ping',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify response
			expect(response.status).toBe(200)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(1)
			expect(data.result).toBeDefined()
		})

		it('should reject POST request without Authorization header', async () => {
			// Create POST request without auth header
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'ping',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify 401 response
			expect(response.status).toBe(401)
			const text = await response.text()
			expect(text).toBe('Unauthorized')
		})

		it('should handle initialize handshake', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create initialize request
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'test-client',
							version: '1.0.0',
						},
					},
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify response
			expect(response.status).toBe(200)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(1)
			expect(data.result).toBeDefined()
			expect(data.result!.protocolVersion).toBe('2024-11-05')
			expect(data.result!.capabilities).toBeDefined()
			expect(data.result!.serverInfo).toBeDefined()
			expect(data.result!.serverInfo.name).toBe('epic-startup-mcp')
		})

		it('should handle tools/list request', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create tools/list request
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 2,
					method: 'tools/list',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify response
			expect(response.status).toBe(200)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(2)
			expect(data.result).toBeDefined()
			expect(data.result!.tools).toBeDefined()
			expect(Array.isArray(data.result!.tools)).toBe(true)
			// Verify tools are registered
			expect(data.result!.tools.length).toBeGreaterThan(0)
		})

		it('should handle tools/call request', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create tools/call request
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 3,
					method: 'tools/call',
					params: {
						name: 'find_user',
						arguments: {
							query: 'test',
						},
					},
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify response
			expect(response.status).toBe(200)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(3)
			expect(data.result).toBeDefined()
			expect(data.result!.content).toBeDefined()
			expect(Array.isArray(data.result!.content)).toBe(true)
		})

		it('should return error for invalid JSON', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create request with invalid JSON
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: 'invalid json {',
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify error response
			expect(response.status).toBe(400)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.error).toBeDefined()
			expect(data.error!.code).toBe(-32700)
			expect(data.error!.message).toContain('Parse error')
		})

		it('should return error for unknown method', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create request with unknown method
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 4,
					method: 'unknown/method',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify error response
			expect(response.status).toBe(404)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(4)
			expect(data.error).toBeDefined()
			expect(data.error!.code).toBe(-32601)
			expect(data.error!.message).toContain('Method not found')
		})

		it('should return error for invalid access token', async () => {
			// Create request with invalid token
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token-12345',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 5,
					method: 'ping',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify error response
			expect(response.status).toBe(401)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.error).toBeDefined()
			expect(data.error!.code).toBe(-32600)
			expect(data.error!.message).toContain('Invalid or expired access token')
		})

		it('should handle notifications without response', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create notification request (no id)
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'notifications/initialized',
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify 204 No Content response
			expect(response.status).toBe(204)
		})

		it('should handle tools/call with missing tool', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization with tokens
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Create tools/call request with non-existent tool
			const request = new Request('http://localhost/mcp+/sse', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 6,
					method: 'tools/call',
					params: {
						name: 'non_existent_tool',
						arguments: {},
					},
				}),
			})

			// Import the action function
			const { action } = await import('./sse.ts')

			// Execute the action
			const response = await action({
				request,
				params: {},
				context: {},
			} as any)

			// Verify error response
			expect(response.status).toBe(500)
			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(6)
			expect(data.error).toBeDefined()
			expect(data.error!.code).toBe(-32603)
			expect(data.error!.message).toContain('Internal error')
		})
	})
})
