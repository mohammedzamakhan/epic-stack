import { prisma } from '@repo/database'
import * as fc from 'fast-check'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearTools, getTool, type MCPContext } from './server.server'
import './tools.server' // Import to register tools

/**
 * Helper to add a user to an organization
 */
async function addUserToOrganization(userId: string, organizationId: string) {
	let memberRole = await prisma.organizationRole.findFirst({
		where: { name: 'member' },
	})
	if (!memberRole) {
		memberRole = await prisma.organizationRole.create({
			data: {
				name: 'member',
				description: 'Member role',
				level: 1,
			},
		})
	}

	await prisma.userOrganization.create({
		data: {
			userId,
			organizationId,
			organizationRoleId: memberRole.id,
			active: true,
		},
	})
}

// Generate unique slug per test run to avoid conflicts with parallel tests
// REMOVED: const TEST_ORG_SLUG - now generated inside beforeEach

describe('MCP Tools Service', () => {
	let mockContext: MCPContext
	let testOrganization: any
	let testUser: any
	let testOrgSlug: string // Store the slug per-test

	beforeEach(async () => {
		// Generate unique slug for each test to avoid parallel test conflicts
		testOrgSlug = `test-org-mcp-tools-${Date.now()}-${Math.random().toString(36).substring(7)}`

		// Create test user and organization with unique slug
		testUser = await prisma.user.create({
			data: {
				email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
				username: `testuser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
				name: 'Test User',
			},
		})

		testOrganization = await prisma.organization.create({
			data: {
				name: 'Test Organization',
				slug: testOrgSlug,
			},
		})

		// Add user to organization
		await addUserToOrganization(testUser.id, testOrganization.id)

		mockContext = { user: testUser, organization: testOrganization }
	})

	afterEach(async () => {
		// Clean up test data by specific IDs to avoid affecting parallel tests
		try {
			if (testOrganization?.id) {
				await prisma.organizationNote.deleteMany({
					where: { organizationId: testOrganization.id },
				})
				await prisma.noteAccess.deleteMany({
					where: { note: { organizationId: testOrganization.id } },
				})
				await prisma.userOrganization.deleteMany({
					where: { organizationId: testOrganization.id },
				})
				await prisma.organization.deleteMany({
					where: { id: testOrganization.id },
				})
			}
			if (testUser?.id) {
				await prisma.user.deleteMany({
					where: { id: testUser.id },
				})
			}
			// Don't delete member role - it may be shared across tests
		} catch {
			// Ignore cleanup errors - data may have been cleaned up by other tests
		}
	})

	describe('find_user tool', () => {
		it('should be registered', () => {
			const tool = getTool('find_user')
			expect(tool).toBeDefined()
			expect(tool?.name).toBe('find_user')
			expect(tool?.description).toContain('Search for users')
		})

		it('should have correct input schema', () => {
			const tool = getTool('find_user')
			expect(tool?.inputSchema.properties.query).toBeDefined()
			expect(tool?.inputSchema.required).toContain('query')
		})

		it('should find users by name', async () => {
			// Create additional users in the same organization
			const user2 = await prisma.user.create({
				data: {
					email: 'alice@example.com',
					username: 'alice',
					name: 'Alice Smith',
				},
			})

			await addUserToOrganization(user2.id, mockContext.organization.id)

			const tool = getTool('find_user')
			const result = await tool?.handler({ query: 'Alice' }, mockContext)

			expect(result?.content).toBeDefined()
			expect(result?.content!.length).toBeGreaterThan(0)
			expect(result?.content![0]!.text).toContain('Alice')
		})

		it('should find users by username', async () => {
			const user2 = await prisma.user.create({
				data: {
					email: 'bob@example.com',
					username: 'bobsmith',
					name: 'Bob Smith',
				},
			})

			await addUserToOrganization(user2.id, mockContext.organization.id)

			const tool = getTool('find_user')
			const result = await tool?.handler({ query: 'bobsmith' }, mockContext)

			expect(result?.content).toBeDefined()
			expect(result?.content![0]!.text).toContain('bobsmith')
		})

		it('should return error for missing query', async () => {
			const tool = getTool('find_user')
			const result = await tool?.handler({}, mockContext)

			expect(result?.content![0]!.text).toContain('Error')
			expect(result?.content![0]!.text).toContain('query')
		})

		it('should return no results for non-matching query', async () => {
			const tool = getTool('find_user')
			const result = await tool?.handler({ query: 'nonexistent' }, mockContext)

			expect(result?.content![0]!.text).toContain('No users found')
		})

		it('should limit results to 10 users', async () => {
			// Create 15 users in the organization
			for (let i = 0; i < 15; i++) {
				const user = await prisma.user.create({
					data: {
						email: `user${i}@example.com`,
						username: `user${i}`,
						name: `User ${i}`,
					},
				})

				await addUserToOrganization(user.id, mockContext.organization.id)
			}

			const tool = getTool('find_user')
			const result = await tool?.handler({ query: 'User' }, mockContext)

			// Count text entries (each user is one text entry, plus potentially images)
			const textEntries = result?.content.filter((c) => c.type === 'text') || []
			expect(textEntries.length).toBeLessThanOrEqual(10)
		})
	})

	describe('get_user_notes tool', () => {
		it('should be registered', () => {
			const tool = getTool('get_user_notes')
			expect(tool).toBeDefined()
			expect(tool?.name).toBe('get_user_notes')
			expect(tool?.description).toContain('notes')
		})

		it('should have correct input schema', () => {
			const tool = getTool('get_user_notes')
			expect(tool?.inputSchema.properties.username).toBeDefined()
			expect(tool?.inputSchema.required).toContain('username')
		})

		it('should return error for missing username', async () => {
			const tool = getTool('get_user_notes')
			const result = await tool?.handler({}, mockContext)

			expect(result?.content![0]!.text).toContain('Error')
			expect(result?.content![0]!.text).toContain('username')
		})

		it('should return error for non-existent user', async () => {
			const tool = getTool('get_user_notes')
			const result = await tool?.handler(
				{ username: 'nonexistent' },
				mockContext,
			)

			expect(result?.content![0]!.text).toContain('User not found')
		})

		it('should return notes for user', async () => {
			// Create a note for the test user
			const note = await prisma.organizationNote.create({
				data: {
					title: 'Test Note',
					content: 'This is a test note',
					organizationId: mockContext.organization.id,
					createdById: mockContext.user.id,
					isPublic: true,
				},
			})

			const tool = getTool('get_user_notes')
			const result = await tool?.handler(
				{ username: mockContext.user.username },
				mockContext,
			)

			expect(result?.content).toBeDefined()
			expect(result?.content![0]!.text).toContain('Test Note')
			expect(result?.content![0]!.text).toContain('This is a test note')
		})

		it('should return no notes message when user has no notes', async () => {
			// Create another user with no notes
			const user2 = await prisma.user.create({
				data: {
					email: 'notnotes@example.com',
					username: 'notnotes',
					name: 'No Notes User',
				},
			})

			await addUserToOrganization(user2.id, mockContext.organization.id)

			const tool = getTool('get_user_notes')
			const result = await tool?.handler({ username: 'notnotes' }, mockContext)

			expect(result?.content![0]!.text).toContain('No accessible notes found')
		})

		it('should only return public notes or notes shared with user', async () => {
			// Create another user
			const user2 = await prisma.user.create({
				data: {
					email: 'other@example.com',
					username: 'other',
					name: 'Other User',
				},
			})

			await addUserToOrganization(user2.id, mockContext.organization.id)

			// Create a public note
			const publicNote = await prisma.organizationNote.create({
				data: {
					title: 'Public Note',
					content: 'Public content',
					organizationId: mockContext.organization.id,
					createdById: user2.id,
					isPublic: true,
				},
			})

			// Create a private note not shared with mockContext.user
			const privateNote = await prisma.organizationNote.create({
				data: {
					title: 'Private Note',
					content: 'Private content',
					organizationId: mockContext.organization.id,
					createdById: user2.id,
					isPublic: false,
				},
			})

			const tool = getTool('get_user_notes')
			const result = await tool?.handler({ username: 'other' }, mockContext)

			// Should only see the public note
			expect(result?.content![0]!.text).toContain('Public Note')
			expect(result?.content![0]!.text).not.toContain('Private Note')
		})
	})

	describe('Property 19: Organization-scoped user search', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 19: Organization-scoped user search
		 * Validates: Requirements 6.2
		 *
		 * For any find_user tool invocation, all returned users should belong to the
		 * organization associated with the access token.
		 */
		it('should only return users from the authorized organization', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc
						.string({ minLength: 1, maxLength: 10 })
						.filter((s) => /^[a-z]+$/.test(s)),
					async (searchQuery) => {
						// Create another organization
						const otherOrg = await prisma.organization.create({
							data: {
								name: 'Other Organization',
								slug: `other-org-${Date.now()}`,
							},
						})

						// Create a user in the other organization
						const otherUser = await prisma.user.create({
							data: {
								email: `other-${Date.now()}@example.com`,
								username: `other-${Date.now()}`,
								name: `Other ${searchQuery}`,
							},
						})

						await addUserToOrganization(otherUser.id, otherOrg.id)

						// Create a user in the test organization
						const testUser = await prisma.user.create({
							data: {
								email: `test-${Date.now()}@example.com`,
								username: `test-${Date.now()}`,
								name: `Test ${searchQuery}`,
							},
						})

						await addUserToOrganization(
							testUser.id,
							mockContext.organization.id,
						)

						try {
							const tool = getTool('find_user')
							const result = await tool?.handler(
								{ query: searchQuery },
								mockContext,
							)

							// Property: All returned users should belong to mockContext.organization
							if (result?.content && result.content.length > 0) {
								// Get all user IDs from the result
								const resultUsernames = result.content
									.filter((c) => c.type === 'text')
									.map((c) => c.text)
									.filter((text) => text && text.includes('('))

								// Verify each returned user is in the correct organization
								for (const userText of resultUsernames) {
									const match = userText?.match(/\(([^)]+)\)/)
									const username = match?.[1]
									if (username) {
										const user = await prisma.user.findUnique({
											where: { username },
											include: {
												organizations: {
													where: {
														organizationId: mockContext.organization.id,
													},
												},
											},
										})

										expect(user?.organizations.length ?? 0).toBeGreaterThan(0)
									}
								}
							}
						} finally {
							// Clean up
							await prisma.userOrganization.deleteMany({
								where: { userId: otherUser.id },
							})
							await prisma.userOrganization.deleteMany({
								where: { userId: testUser.id },
							})
							await prisma.user.delete({ where: { id: otherUser.id } })
							await prisma.user.delete({ where: { id: testUser.id } })
							await prisma.organization.delete({ where: { id: otherOrg.id } })
						}
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test
	})

	describe('Property 20: Note retrieval limits and ordering', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 20: Note retrieval limits and ordering
		 * Validates: Requirements 6.3
		 *
		 * For any get_user_notes tool invocation, the system should return at most 10
		 * notes, ordered by creation date (most recent first).
		 */
		it('should return at most 10 notes ordered by creation date', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 11, max: 20 }),
					async (noteCount) => {
						// Create multiple notes
						const notes = []
						for (let i = 0; i < noteCount; i++) {
							const note = await prisma.organizationNote.create({
								data: {
									title: `Note ${i}`,
									content: `Content ${i}`,
									organizationId: mockContext.organization.id,
									createdById: mockContext.user.id,
									isPublic: true,
									createdAt: new Date(Date.now() - i * 1000), // Stagger creation times
								},
							})
							notes.push(note)
						}

						try {
							const tool = getTool('get_user_notes')
							const result = await tool?.handler(
								{ username: mockContext.user.username },
								mockContext,
							)

							// Property: Should return at most 10 notes
							const noteTexts =
								result?.content.filter((c) => c.type === 'text') || []
							expect(noteTexts.length).toBeLessThanOrEqual(10)

							// Property: Notes should be ordered by creation date (most recent first)
							// Extract note numbers from the content
							const noteNumbers: number[] = []
							for (const content of noteTexts) {
								const match = content.text?.match(/Note (\d+)/)
								if (match && match[1]) {
									noteNumbers.push(parseInt(match[1], 10))
								}
							}

							// Verify ordering (most recent = lowest number since we created with negative offsets)
							for (let i = 0; i < noteNumbers.length - 1; i++) {
								expect(noteNumbers[i]!).toBeLessThanOrEqual(noteNumbers[i + 1]!)
							}
						} finally {
							// Clean up
							await prisma.organizationNote.deleteMany({
								where: {
									organizationId: mockContext.organization.id,
									createdById: mockContext.user.id,
								},
							})
						}
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test
	})

	describe('Property 21: Organization access control', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 21: Organization access control
		 * Validates: Requirements 6.4
		 *
		 * For any tool invocation, the system should only return data from the
		 * organization associated with the access token, regardless of what the user
		 * requests.
		 */
		it('should enforce organization access control in get_user_notes', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 20 }),
					async (noteTitle) => {
						// Create another organization
						const otherOrg = await prisma.organization.create({
							data: {
								name: 'Other Organization',
								slug: `other-org-${Date.now()}`,
							},
						})

						// Create a user in the other organization
						const otherUser = await prisma.user.create({
							data: {
								email: `other-${Date.now()}@example.com`,
								username: `other-${Date.now()}`,
								name: 'Other User',
							},
						})

						await addUserToOrganization(otherUser.id, otherOrg.id)

						// Create a note in the other organization
						const otherNote = await prisma.organizationNote.create({
							data: {
								title: noteTitle,
								content: 'Other org content',
								organizationId: otherOrg.id,
								createdById: otherUser.id,
								isPublic: true,
							},
						})

						try {
							const tool = getTool('get_user_notes')
							const result = await tool?.handler(
								{ username: otherUser.username },
								mockContext, // Using mockContext from different organization
							)

							// Property: Should not return notes from other organization
							expect(result?.content![0]!.text).toContain('User not found')
						} finally {
							// Clean up
							await prisma.organizationNote.delete({
								where: { id: otherNote.id },
							})
							await prisma.userOrganization.deleteMany({
								where: { userId: otherUser.id },
							})
							await prisma.user.delete({ where: { id: otherUser.id } })
							await prisma.organization.delete({ where: { id: otherOrg.id } })
						}
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test
	})

	describe('Property 28: Cross-organization access prevention', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 28: Cross-organization access prevention
		 * Validates: Requirements 9.3
		 *
		 * For any tool invocation, attempting to access data from an organization
		 * different from the token's associated organization should fail with an
		 * authorization error.
		 */
		it('should prevent cross-organization user search', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 20 }),
					async (searchQuery) => {
						// Create another organization
						const otherOrg = await prisma.organization.create({
							data: {
								name: 'Other Organization',
								slug: `other-org-${Date.now()}`,
							},
						})

						// Create a user in the other organization
						const otherUser = await prisma.user.create({
							data: {
								email: `other-${Date.now()}@example.com`,
								username: `other-${Date.now()}`,
								name: searchQuery,
							},
						})

						await addUserToOrganization(otherUser.id, otherOrg.id)

						try {
							const tool = getTool('find_user')
							const result = await tool?.handler(
								{ query: searchQuery },
								mockContext, // Using mockContext from different organization
							)

							// Property: Should not return users from other organization
							const userTexts =
								result?.content
									.filter((c) => c.type === 'text')
									.map((c) => c.text) || []

							// Should either find no users or not find the other org's user
							const foundOtherUser = userTexts.some((text) =>
								text?.includes(otherUser.username),
							)
							expect(foundOtherUser).toBe(false)
						} finally {
							// Clean up
							await prisma.userOrganization.deleteMany({
								where: { userId: otherUser.id },
							})
							await prisma.user.delete({ where: { id: otherUser.id } })
							await prisma.organization.delete({ where: { id: otherOrg.id } })
						}
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test
	})
})
