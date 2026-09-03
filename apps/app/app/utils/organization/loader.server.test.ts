import { db, eq, Organization } from '@repo/database'
import { describe, expect, it } from 'vitest'
import {
	createAuthenticatedRequest,
	createTestOrganization,
	createTestSession,
	createTestUser,
	setupTestOrgWithUser,
} from '#tests/test-utils.ts'
import { requireUserOrganization, validateOrgAccess } from './loader.server.ts'

describe('organization loader.server integration', () => {
	describe('requireUserOrganization', () => {
		it('returns organization for active member', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('member')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}`,
				{},
				cookie,
			)

			const result = await requireUserOrganization(request, organization.slug)
			expect(result).toBeDefined()
			expect(result.id).toBe(organization.id)
			expect(result.slug).toBe(organization.slug)
		})

		it('returns only requested columns when column map is provided', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}`,
				{},
				cookie,
			)

			const result = await requireUserOrganization(request, organization.slug, {
				id: true,
				slug: true,
			})

			expect(result.id).toBe(organization.id)
			expect(result.slug).toBe(organization.slug)
			// name should not be present in the returned partial object
			expect((result as any).name).toBeUndefined()
		})

		it('throws 404 when user is not a member of the organization', async () => {
			const outsider = await createTestUser()
			const { cookie } = await createTestSession(outsider.id)

			const owner = await createTestUser()
			const org = await createTestOrganization(owner.id, 'admin')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${org.slug}`,
				{},
				cookie,
			)

			try {
				await requireUserOrganization(request, org.slug)
				expect.fail('Expected 404 response')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})

		it('throws 404 when organization is inactive', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('admin')

			// Deactivate organization
			await db
				.update(Organization)
				.set({ active: false })
				.where(eq(Organization.id, organization.id))

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}`,
				{},
				cookie,
			)

			try {
				await requireUserOrganization(request, organization.slug)
				expect.fail('Expected 404 response for inactive organization')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})
	})

	describe('validateOrgAccess', () => {
		it('throws 400 when orgSlug is missing', async () => {
			const request = new Request('http://localhost:3000/api/org')

			try {
				await validateOrgAccess(request, undefined)
				expect.fail('Expected 400 response')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(400)
			}
		})

		it('throws 404 when organization does not exist', async () => {
			const user = await createTestUser()
			const { cookie } = await createTestSession(user.id)

			const request = createAuthenticatedRequest(
				'http://localhost:3000/non-existent-org',
				{},
				cookie,
			)

			try {
				await validateOrgAccess(request, 'non-existent-org-slug')
				expect.fail('Expected 404 response')
			} catch (error: any) {
				expect(error).toBeInstanceOf(Response)
				expect(error.status).toBe(404)
			}
		})

		it('returns organization id when user has access', async () => {
			const { organization, cookie } = await setupTestOrgWithUser('member')

			const request = createAuthenticatedRequest(
				`http://localhost:3000/${organization.slug}`,
				{},
				cookie,
			)

			const result = await validateOrgAccess(request, organization.slug)
			expect(result.id).toBe(organization.id)
		})
	})
})
