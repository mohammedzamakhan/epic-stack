import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/auth.server.ts', () => ({
	requireUserId: vi.fn(),
}))

vi.mock('../src/permissions.server.ts', () => ({
	checkUserHasPermission: vi.fn(),
	checkUserHasRole: vi.fn(),
}))

vi.mock('../src/organization-permissions.server.ts', () => ({
	userHasOrganizationPermission: vi.fn(),
}))

import { requireUserId } from '../src/auth.server.ts'
import {
	authorize,
	createForbiddenResponse,
	parsePermissionString,
} from '../src/authorize.server.ts'
import {
	checkUserHasPermission,
	checkUserHasRole,
} from '../src/permissions.server.ts'
import { userHasOrganizationPermission } from '../src/organization-permissions.server.ts'

describe('authorize', () => {
	const request = new Request('https://app.example.test/resource')

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireUserId).mockResolvedValue('user-1')
		vi.mocked(checkUserHasPermission).mockResolvedValue('user-1')
		vi.mocked(checkUserHasRole).mockResolvedValue({
			id: 'user-1',
			defaultOrganizationId: 'org-1',
		})
		vi.mocked(userHasOrganizationPermission).mockResolvedValue(true)
	})

	it('evaluates each requested authorization dimension for the authenticated user', async () => {
		await expect(
			authorize(request, {
				permission: 'read:note:own',
				role: 'admin',
				organizationId: 'org-1',
				orgPermission: 'read:website:any',
			}),
		).resolves.toBe('user-1')

		expect(checkUserHasPermission).toHaveBeenCalledWith(
			'user-1',
			'read:note:own',
		)
		expect(checkUserHasRole).toHaveBeenCalledWith('user-1', 'admin')
		expect(userHasOrganizationPermission).toHaveBeenCalledWith(
			'user-1',
			'org-1',
			'read:website:any',
		)
	})

	it('returns a consistent 403 response when an organization permission is denied', async () => {
		vi.mocked(userHasOrganizationPermission).mockResolvedValue(false)

		await expect(
			authorize.orgPermission(request, 'org-1', 'read:website:any'),
		).rejects.toMatchObject({ status: 403 })
	})

	it('parses permissions and builds role-denial responses consistently', async () => {
		expect(parsePermissionString('read:note:own,org')).toEqual({
			action: 'read',
			entity: 'note',
			access: ['own', 'org'],
		})

		const response = createForbiddenResponse('admin', true)
		expect(response.status).toBe(403)
		expect(await response.text()).toBe('Unauthorized: required role: admin')
	})
})
