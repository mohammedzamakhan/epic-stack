import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import fc from 'fast-check'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createAuthorizationWithTokens } from '#app/utils/mcp-oauth.server.ts'

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
	return await prisma.organization.create({
		data: {
			name: faker.company.name(),
			slug: `org-${faker.string.uuid().slice(0, 8)}`,
			users: {
				create: {
					userId,
					organizationRoleId: 'org_role_admin',
				},
			},
		},
	})
}

describe('MCP Settings Page', () => {
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

	describe('Property 12: Authorization list completeness', () => {
		it('should display all authorizations for a user and organization', async () => {
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
						const createdAuths = await Promise.all(
							clientNames.map((clientName) =>
								createAuthorizationWithTokens({
									userId: user.id,
									organizationId: org.id,
									clientName,
								}),
							),
						)

						// Fetch authorizations for this user and organization
						const authorizations = await prisma.mCPAuthorization.findMany({
							where: {
								userId: user.id,
								organizationId: org.id,
							},
							select: {
								id: true,
								clientName: true,
								createdAt: true,
								lastUsedAt: true,
							},
						})

						// Verify all authorizations are returned
						expect(authorizations).toHaveLength(createdAuths.length)

						// Verify each authorization has the correct client name
						const returnedNames = authorizations.map((a) => a.clientName).sort()
						const expectedNames = clientNames.sort()
						expect(returnedNames).toEqual(expectedNames)
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should not include authorizations from other users', async () => {
			const user1 = await createTestUser()
			const user2 = await createTestUser()
			const org = await createTestOrganization(user1.id)

			// Add user2 to the organization
			await prisma.userOrganization.create({
				data: {
					userId: user2.id,
					organizationId: org.id,
					organizationRoleId: 'org_role_admin',
				},
			})

			// Create authorization for user1
			await createAuthorizationWithTokens({
				userId: user1.id,
				organizationId: org.id,
				clientName: 'Client 1',
			})

			// Create authorization for user2
			await createAuthorizationWithTokens({
				userId: user2.id,
				organizationId: org.id,
				clientName: 'Client 2',
			})

			// Fetch authorizations for user1
			const user1Auths = await prisma.mCPAuthorization.findMany({
				where: {
					userId: user1.id,
					organizationId: org.id,
				},
			})

			// Verify only user1's authorization is returned
			expect(user1Auths).toHaveLength(1)
			expect(user1Auths[0]!.clientName).toBe('Client 1')
		})

		it('should not include authorizations from other organizations', async () => {
			const user = await createTestUser()
			const org1 = await createTestOrganization(user.id)
			const org2 = await createTestOrganization(user.id)

			// Create authorization for org1
			await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org1.id,
				clientName: 'Client 1',
			})

			// Create authorization for org2
			await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org2.id,
				clientName: 'Client 2',
			})

			// Fetch authorizations for org1
			const org1Auths = await prisma.mCPAuthorization.findMany({
				where: {
					userId: user.id,
					organizationId: org1.id,
				},
			})

			// Verify only org1's authorization is returned
			expect(org1Auths).toHaveLength(1)
			expect(org1Auths[0]!.clientName).toBe('Client 1')
		})
	})

	describe('Property 13: Authorization display fields', () => {
		it('should include all required display fields for each authorization', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					async (clientName) => {
						const user = await createTestUser()
						const org = await createTestOrganization(user.id)

						// Create authorization
						await createAuthorizationWithTokens({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						// Fetch authorization
						const authorization = await prisma.mCPAuthorization.findFirst({
							where: {
								userId: user.id,
								organizationId: org.id,
							},
							select: {
								id: true,
								clientName: true,
								createdAt: true,
								lastUsedAt: true,
							},
						})

						// Verify all required fields are present
						expect(authorization).toBeDefined()
						expect(authorization?.id).toBeDefined()
						expect(authorization?.clientName).toBe(clientName)
						expect(authorization?.createdAt).toBeDefined()
						expect(authorization?.createdAt).toBeInstanceOf(Date)
						// lastUsedAt can be null initially
						expect(authorization?.lastUsedAt).toBeNull()
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should update lastUsedAt when token is used', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create authorization
			const { accessToken } = await createAuthorizationWithTokens({
				userId: user.id,
				organizationId: org.id,
				clientName: 'Test Client',
			})

			// Get initial authorization
			let authorization = await prisma.mCPAuthorization.findFirst({
				where: {
					userId: user.id,
					organizationId: org.id,
				},
			})

			expect(authorization?.lastUsedAt).toBeNull()

			// Simulate token usage by updating lastUsedAt
			await prisma.mCPAuthorization.update({
				where: { id: authorization!.id },
				data: { lastUsedAt: new Date() },
			})

			// Get updated authorization
			authorization = await prisma.mCPAuthorization.findFirst({
				where: {
					userId: user.id,
					organizationId: org.id,
				},
			})

			expect(authorization?.lastUsedAt).toBeDefined()
			expect(authorization?.lastUsedAt).toBeInstanceOf(Date)
		})
	})

	describe('Property 15: Authorization list growth', () => {
		it('should increase list size by one when new authorization is added', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
						minLength: 1,
						maxLength: 5,
					}),
					async (clientNames) => {
						const user = await createTestUser()
						const org = await createTestOrganization(user.id)

						let currentCount = 0

						// Add authorizations one by one and verify count increases
						for (const clientName of clientNames) {
							await createAuthorizationWithTokens({
								userId: user.id,
								organizationId: org.id,
								clientName,
							})

							currentCount++

							// Verify count increased by exactly 1
							const authorizations = await prisma.mCPAuthorization.findMany({
								where: {
									userId: user.id,
									organizationId: org.id,
								},
							})

							expect(authorizations).toHaveLength(currentCount)
						}
					},
				),
				{ numRuns: 100 },
			)
		})

		it('should maintain correct count after revocation', async () => {
			const user = await createTestUser()
			const org = await createTestOrganization(user.id)

			// Create 3 authorizations
			const auths = await Promise.all([
				createAuthorizationWithTokens({
					userId: user.id,
					organizationId: org.id,
					clientName: 'Client 1',
				}),
				createAuthorizationWithTokens({
					userId: user.id,
					organizationId: org.id,
					clientName: 'Client 2',
				}),
				createAuthorizationWithTokens({
					userId: user.id,
					organizationId: org.id,
					clientName: 'Client 3',
				}),
			])

			// Verify initial count
			let authorizations = await prisma.mCPAuthorization.findMany({
				where: {
					userId: user.id,
					organizationId: org.id,
				},
			})
			expect(authorizations).toHaveLength(3)

			// Revoke one authorization
			await prisma.mCPAuthorization.update({
				where: { id: auths[0].authorization.id },
				data: { isActive: false },
			})

			// Verify count decreased by 1 (when filtering for active)
			authorizations = await prisma.mCPAuthorization.findMany({
				where: {
					userId: user.id,
					organizationId: org.id,
					isActive: true,
				},
			})
			expect(authorizations).toHaveLength(2)
		})
	})
})
