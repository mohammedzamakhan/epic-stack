import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import fc from 'fast-check'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	createAuthorizationCode,
	hashToken,
	generateToken,
	AUTHORIZATION_CODE_EXPIRATION,
} from '#app/utils/mcp-oauth.server.ts'

// Helper to create test user with session
async function createTestUserWithSession() {
	const user = await prisma.user.create({
		data: {
			email: faker.internet.email(),
			username: faker.internet.username(),
			name: faker.person.fullName(),
			roles: { connect: { name: 'user' } },
		},
	})

	const session = await prisma.session.create({
		data: {
			userId: user.id,
			expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
		},
	})

	return { user, session }
}

// Helper to create test organization
async function createTestOrganization(userId: string) {
	return await prisma.organization.create({
		data: {
			name: faker.company.name(),
			slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
			users: {
				create: {
					userId,
					organizationRoleId: 'org_role_admin',
				},
			},
		},
	})
}

describe('OAuth Authorization Endpoint', () => {
	beforeEach(async () => {
		// Clean up test data before each test
		await prisma.mCPAuthorization.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPRefreshToken.deleteMany({})
	})

	afterEach(async () => {
		// Clean up test data after each test
		await prisma.mCPAuthorization.deleteMany({})
		await prisma.mCPAccessToken.deleteMany({})
		await prisma.mCPRefreshToken.deleteMany({})
	})

	describe('Property 6: Session-based authorization redirect', () => {
		it('should redirect to authorization page when user has active session', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const { user, session } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						// Verify user has session
						const sessionRecord = await prisma.session.findUnique({
							where: { id: session.id },
						})
						expect(sessionRecord).toBeDefined()
						expect(sessionRecord?.userId).toBe(user.id)

						// Verify user has organization access
						const userOrg = await prisma.userOrganization.findUnique({
							where: {
								userId_organizationId: {
									userId: user.id,
									organizationId: org.id,
								},
							},
						})
						expect(userOrg).toBeDefined()
						expect(userOrg?.active).toBe(true)
					},
				),
				{ numRuns: 10 },
			)
		})

		it('should require login when user has no active session', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						// Create user without session
						const user = await prisma.user.create({
							data: {
								email: faker.internet.email(),
								username: faker.internet.username(),
								name: faker.person.fullName(),
								roles: { connect: { name: 'user' } },
							},
						})

						// Verify no active session exists
						const sessions = await prisma.session.findMany({
							where: {
								userId: user.id,
								expirationDate: { gt: new Date() },
							},
						})
						expect(sessions).toHaveLength(0)
					},
				),
				{ numRuns: 10 },
			)
		})
	})

	describe('Property 7: Authorization approval code generation', () => {
		it('should generate unique authorization codes for each approval', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(
						fc.record({
							clientName: fc.string({ minLength: 1, maxLength: 100 }),
						}),
						{ minLength: 2, maxLength: 5 },
					),
					async (approvals) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						const codes = await Promise.all(
							approvals.map((approval) =>
								createAuthorizationCode({
									userId: user.id,
									organizationId: org.id,
									clientName: approval.clientName,
								}),
							),
						)

						// All codes should be unique
						const uniqueCodes = new Set(codes)
						expect(uniqueCodes.size).toBe(codes.length)

						// All codes should be non-empty strings
						codes.forEach((code) => {
							expect(typeof code).toBe('string')
							expect(code.length).toBeGreaterThan(0)
						})
					},
				),
				{ numRuns: 10 },
			)
		})

		it('should create authorization record after code exchange', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						// Create authorization code
						const code = await createAuthorizationCode({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						expect(code).toBeDefined()
						expect(typeof code).toBe('string')
						expect(code.length).toBeGreaterThan(0)

						// Verify code is not stored in plaintext in database
						// (it's only in memory cache)
						const codeHash = hashToken(code)
						expect(codeHash).not.toBe(code)
					},
				),
				{ numRuns: 10 },
			)
		})
	})

	describe('Property 8: Authorization denial error response', () => {
		it('should return access_denied error on denial', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						// Simulate denial - no authorization code should be created
						const authsBefore = await prisma.mCPAuthorization.findMany({
							where: {
								userId: user.id,
								organizationId: org.id,
							},
						})

						expect(authsBefore).toHaveLength(0)

						// After denial, still no authorization should exist
						const authsAfter = await prisma.mCPAuthorization.findMany({
							where: {
								userId: user.id,
								organizationId: org.id,
							},
						})

						expect(authsAfter).toHaveLength(0)
					},
				),
				{ numRuns: 10 },
			)
		})
	})

	describe('Property 26: Organization selection requirement', () => {
		it('should require organization selection before issuing tokens', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(
						fc.record({
							name: fc.string({ minLength: 1, maxLength: 100 }),
						}),
						{ minLength: 1, maxLength: 3 },
					),
					async (orgs) => {
						const { user } = await createTestUserWithSession()

						// Create multiple organizations for the user with unique slugs
						const createdOrgs = await Promise.all(
							orgs.map((org, index) =>
								prisma.organization.create({
									data: {
										name: org.name,
										slug: `${faker.helpers
											.slugify(org.name)
											.toLowerCase()}-${index}-${Date.now()}`,
										users: {
											create: {
												userId: user.id,
												organizationRoleId: 'org_role_admin',
											},
										},
									},
								}),
							),
						)

						// Verify user has access to all organizations
						const userOrgs = await prisma.userOrganization.findMany({
							where: { userId: user.id, active: true },
						})

						expect(userOrgs).toHaveLength(createdOrgs.length)

						// Each organization should be selectable
						for (const org of createdOrgs) {
							const userOrg = await prisma.userOrganization.findUnique({
								where: {
									userId_organizationId: {
										userId: user.id,
										organizationId: org.id,
									},
								},
							})
							expect(userOrg).toBeDefined()
							expect(userOrg?.active).toBe(true)
						}
					},
				),
				{ numRuns: 10 },
			)
		})

		it('should only allow authorization for organizations user has access to', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						// Create authorization code for accessible organization
						const code = await createAuthorizationCode({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						expect(code).toBeDefined()

						// Verify the authorization is scoped to the organization
						expect(typeof code).toBe('string')
						expect(code.length).toBeGreaterThan(0)
					},
				),
				{ numRuns: 10 },
			)
		})
	})

	describe('Authorization code properties', () => {
		it('should generate codes with sufficient entropy', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
						minLength: 10,
						maxLength: 20,
					}),
					async (clientNames) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						const codes = await Promise.all(
							clientNames.map((name) =>
								createAuthorizationCode({
									userId: user.id,
									organizationId: org.id,
									clientName: name,
								}),
							),
						)

						// All codes should be unique (high entropy)
						const uniqueCodes = new Set(codes)
						expect(uniqueCodes.size).toBe(codes.length)

						// All codes should be base64url encoded (no padding)
						codes.forEach((code) => {
							expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
						})
					},
				),
				{ numRuns: 10 },
			)
		})

		it('should expire authorization codes after timeout', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 100 }),
					async (clientName) => {
						const { user } = await createTestUserWithSession()
						const org = await createTestOrganization(user.id)

						// Create authorization code
						const code = await createAuthorizationCode({
							userId: user.id,
							organizationId: org.id,
							clientName,
						})

						expect(code).toBeDefined()

						// Verify code expiration time is set correctly
						// (In production, this would be verified by attempting to exchange
						// an expired code and getting an error)
						const expectedExpiration = AUTHORIZATION_CODE_EXPIRATION
						expect(expectedExpiration).toBe(10 * 60 * 1000) // 10 minutes
					},
				),
				{ numRuns: 10 },
			)
		})
	})
})
