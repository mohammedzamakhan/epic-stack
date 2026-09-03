import { describe, expect, it } from 'vitest'
import {
	addOrganizationMember,
	createAuthenticatedRequest,
	createTestSession,
	createTestUser,
	setupTestOrgWithUser,
} from '#tests/test-utils.ts'
import {
	ORG_PERMISSIONS,
	requireUserWithOrganizationPermission,
} from './permissions.server.ts'

describe('organization permissions.server integration', () => {
	it('throws 401 Unauthorized when request is unauthenticated', async () => {
		const request = new Request('http://localhost:3000/api/test')

		try {
			await requireUserWithOrganizationPermission(
				request,
				'org-123',
				ORG_PERMISSIONS.READ_MEMBER_ANY,
			)
			expect.fail('Expected 401 response')
		} catch (error: any) {
			expect(error).toBeInstanceOf(Response)
			expect(error.status).toBe(401)
		}
	})

	it('resolves successfully when user has the required permission', async () => {
		const { user, organization, cookie } = await setupTestOrgWithUser('admin')

		const request = createAuthenticatedRequest(
			`http://localhost:3000/${organization.slug}`,
			{},
			cookie,
		)

		const userId = await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.READ_NOTE_ANY,
		)

		expect(userId).toBe(user.id)
	})

	it('throws 403 Forbidden when user belongs to org but lacks the permission', async () => {
		const { organization } = await setupTestOrgWithUser('admin')

		const guest = await createTestUser()
		await addOrganizationMember(guest.id, organization.id, 'org_role_guest')
		const { cookie } = await createTestSession(guest.id)

		const request = createAuthenticatedRequest(
			`http://localhost:3000/${organization.slug}`,
			{},
			cookie,
		)

		try {
			await requireUserWithOrganizationPermission(
				request,
				organization.id,
				ORG_PERMISSIONS.DELETE_MEMBER_ANY,
			)
			expect.fail('Expected 403 response')
		} catch (error: any) {
			expect(error).toBeInstanceOf(Response)
			expect(error.status).toBe(403)
		}
	})
})
