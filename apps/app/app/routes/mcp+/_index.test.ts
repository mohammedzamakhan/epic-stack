import { faker } from '@faker-js/faker'

import { getMcpServerName } from '@repo/config/brand'
import {
	MCPAccessToken,
	MCPAuthorization,
	MCPRefreshToken,
	Organization,
	OrganizationRole,
	Role,
	User,
	UserOrganization,
	_RoleToUser,
	db,
	eq,
	inArray,
	or,
} from '@repo/database'
import fc from 'fast-check'
import { RouterContextProvider } from 'react-router'
import { describe, it, expect, afterEach } from 'vitest'
import { serverBuildContext } from '#app/server-context.ts'
import {
	validateAccessToken,
	createAuthorizationWithTokens,
} from '#app/utils/mcp/oauth.server.ts'
import { MCP_PROTOCOL_VERSION } from '#app/utils/mcp/streamable-http.server.ts'

const createMockContext = () => {
	const ctx = new RouterContextProvider()
	ctx.set(serverBuildContext, {} as any)
	return ctx
}

interface JsonRpcResponse {
	jsonrpc: string
	id?: number
	result?: any
	error?: {
		code: number
		message: string
	}
}

async function connectUserRole(userId: string, roleName: string) {
	const [role] = await db
		.select({ id: Role.id })
		.from(Role)
		.where(eq(Role.name, roleName))
		.limit(1)
	if (role) {
		await db.insert(_RoleToUser).values({ A: role.id, B: userId })
	}
}

async function createTestUser(createdUserIds: string[]) {
	const [user] = await db
		.insert(User)
		.values({
			email: faker.internet.email(),
			username: `user-${faker.string.uuid().slice(0, 8)}`,
			name: faker.person.fullName(),
		})
		.returning()
	if (!user) throw new Error('Failed to insert user')
	await connectUserRole(user.id, 'user')
	createdUserIds.push(user.id)
	return user
}

async function createTestOrganization(userId: string, createdOrgIds: string[]) {
	let [adminRole] = await db
		.select()
		.from(OrganizationRole)
		.where(eq(OrganizationRole.name, 'admin'))
		.limit(1)
	if (!adminRole) {
		;[adminRole] = await db
			.insert(OrganizationRole)
			.values({
				name: 'admin',
				description: 'Administrator role',
				level: 4,
			})
			.returning()
		if (!adminRole) throw new Error('Admin role not found')
	}

	const [org] = await db
		.insert(Organization)
		.values({
			name: faker.company.name(),
			slug: `org-${faker.string.uuid().slice(0, 8)}`,
		})
		.returning()
	if (!org) throw new Error('Failed to insert organization')
	await db.insert(UserOrganization).values({
		userId,
		organizationId: org.id,
		organizationRoleId: adminRole.id,
	})
	createdOrgIds.push(org.id)
	return org
}

describe('MCP Stateless Endpoint', () => {
	const createdUserIds: string[] = []
	const createdOrgIds: string[] = []

	afterEach(async () => {
		if (createdUserIds.length > 0 || createdOrgIds.length > 0) {
			const authIds = db
				.select({ id: MCPAuthorization.id })
				.from(MCPAuthorization)
				.where(
					or(
						inArray(MCPAuthorization.userId, createdUserIds),
						inArray(MCPAuthorization.organizationId, createdOrgIds),
					),
				)
			await db
				.delete(MCPRefreshToken)
				.where(inArray(MCPRefreshToken.authorizationId, authIds))
			await db
				.delete(MCPAccessToken)
				.where(inArray(MCPAccessToken.authorizationId, authIds))
			await db
				.delete(MCPAuthorization)
				.where(
					or(
						inArray(MCPAuthorization.userId, createdUserIds),
						inArray(MCPAuthorization.organizationId, createdOrgIds),
					),
				)
			await db
				.delete(UserOrganization)
				.where(
					or(
						inArray(UserOrganization.userId, createdUserIds),
						inArray(UserOrganization.organizationId, createdOrgIds),
					),
				)
			await db
				.delete(Organization)
				.where(inArray(Organization.id, createdOrgIds))
			await db.delete(User).where(inArray(User.id, createdUserIds))
			createdUserIds.length = 0
			createdOrgIds.length = 0
		}
	})

	describe('Authentication', () => {
		it('should authenticate request with valid access token', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const user = await createTestUser(createdUserIds)
						const org = await createTestOrganization(user.id, createdOrgIds)
						const { accessToken } = await createAuthorizationWithTokens({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})
						const tokenData = await validateAccessToken(accessToken)
						expect(tokenData).toBeDefined()
						expect(tokenData?.user.id).toBe(user.id)
						expect(tokenData?.organization.id).toBe(org.id)
					},
				),
				{ numRuns: 10 },
			)
		}, 30000)

		it('should reject request with invalid access token', async () => {
			const { action } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer invalid-token',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'ping',
				}),
			})
			const response = await action({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(401)
		})
	})

	describe('Stateless Server Discovery', () => {
		it('should handle server/discover method', async () => {
			const user = await createTestUser(createdUserIds)
			const org = await createTestOrganization(user.id, createdOrgIds)
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test',
			})

			const { action } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Mcp-Method': 'server/discover',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					_meta: {},
				}),
			})

			const response = await action({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(200)

			const data = (await response.json()) as JsonRpcResponse
			expect(data.jsonrpc).toBe('2.0')
			expect(data.id).toBe(1)
			expect(data.result).toBeDefined()
			expect(data.result!.protocolVersion).toBe(MCP_PROTOCOL_VERSION)
			expect(data.result!.capabilities).toBeDefined()
			expect(data.result!.serverInfo).toBeDefined()
			expect(data.result!.serverInfo.name).toBe(getMcpServerName())
		})
	})

	describe('Stateless Tool Invocations', () => {
		it('should list tools using Mcp-Method header without sessions', async () => {
			const user = await createTestUser(createdUserIds)
			const org = await createTestOrganization(user.id, createdOrgIds)
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			const { action } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Mcp-Method': 'tools/list',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
				}),
			})

			const response = await action({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(200)

			const data = (await response.json()) as JsonRpcResponse
			expect(data.result.tools).toBeDefined()
			expect(Array.isArray(data.result.tools)).toBe(true)
			expect(data.result._meta.cache.ttlMs).toBe(3600000)
		})

		it('should call tool using Mcp-Method and Mcp-Name headers', async () => {
			const user = await createTestUser(createdUserIds)
			const org = await createTestOrganization(user.id, createdOrgIds)
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			const { action } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Mcp-Method': 'tools/call',
					'Mcp-Name': 'find_user',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					params: {
						arguments: { query: 'test' },
					},
				}),
			})

			const response = await action({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(200)

			const data = (await response.json()) as JsonRpcResponse
			expect(data.result.content).toBeDefined()
			expect(Array.isArray(data.result.content)).toBe(true)
		})
	})

	describe('Subscriptions Listen endpoint', () => {
		it('should open SSE stream on subscriptions/listen', async () => {
			const user = await createTestUser(createdUserIds)
			const org = await createTestOrganization(user.id, createdOrgIds)
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test',
			})

			const { action } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp/subscriptions/listen', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Mcp-Method': 'subscriptions/listen',
				},
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
				}),
			})

			const response = await action({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(200)
			expect(response.headers.get('Content-Type')).toBe('text/event-stream')
		})

		it('legacy GET requests should be rejected', async () => {
			const { loader } = await import('./_index.ts')
			const request = new Request('http://localhost/mcp', {
				method: 'GET',
			})
			const response = await loader({
				request,
				params: {},
				context: createMockContext(),
			} as any)
			expect(response.status).toBe(405)
		})
	})
})
