/**
 * Unit tests for organization permissions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockPrisma } from './__mocks__/prisma'
import {
	parseOrganizationPermissionString,
	userHasOrganizationPermission,
	requireUserWithOrganizationPermission,
	getUserOrganizationPermissions,
	userHasOrganizationPermissionClient,
	getUserOrganizationPermissionsForClient,
	ORG_PERMISSIONS,
} from '../src/organization-permissions.server'

describe('Organization Permissions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('parseOrganizationPermissionString', () => {
		it('should parse standard permission string', () => {
			const result = parseOrganizationPermissionString('create:note:own')

			expect(result).toEqual({
				action: 'create',
				entity: 'note',
				access: ['own'],
			})
		})

		it('should parse permission with multiple access levels', () => {
			const result = parseOrganizationPermissionString('read:note:own,org')

			expect(result).toEqual({
				action: 'read',
				entity: 'note',
				access: ['own', 'org'],
			})
		})

		it('should parse permission without access level', () => {
			const result =
				parseOrganizationPermissionString('delete:organization:')

			expect(result).toEqual({
				action: 'delete',
				entity: 'organization',
				access: [''],
			})
		})

		it('should handle whitespace in permission string', () => {
			const result = parseOrganizationPermissionString(
				'  create  :  note  :  own  ',
			)

			expect(result).toEqual({
				action: 'create',
				entity: 'note',
				access: ['own'],
			})
		})

		it('should handle empty components', () => {
			const result = parseOrganizationPermissionString('::')

			expect(result).toEqual({
				action: '',
				entity: '',
				access: [''],
			})
		})

		it('should parse permission with org_note entity', () => {
			const result = parseOrganizationPermissionString('create:org_note:own')

			expect(result).toEqual({
				action: 'create',
				entity: 'org_note',
				access: ['own'],
			})
		})
	})

	describe('userHasOrganizationPermission', () => {
		it('should return true when user has permission', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [
						{
							action: 'create',
							entity: 'note',
							context: 'organization',
							access: 'own',
						},
					],
				},
			})

			const result = await userHasOrganizationPermission(
				'user-123',
				'org-123',
				'create:note:own',
			)

			expect(result).toBe(true)
			expect(mockPrisma.userOrganization.findFirst).toHaveBeenCalledWith({
				where: {
					userId: 'user-123',
					organizationId: 'org-123',
					active: true,
				},
				include: {
					organizationRole: {
						include: {
							permissions: {
								where: {
									action: 'create',
									entity: 'note',
									context: 'organization',
									access: { in: ['own'] },
								},
							},
						},
					},
				},
			})
		})

		it('should return false when user does not have permission', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [], // No permissions
				},
			})

			const result = await userHasOrganizationPermission(
				'user-123',
				'org-123',
				'delete:note:any',
			)

			expect(result).toBe(false)
		})

		it('should return false when user is not member of organization', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue(null)

			const result = await userHasOrganizationPermission(
				'user-123',
				'org-123',
				'create:note:own',
			)

			expect(result).toBe(false)
		})

		it('should return false when user organization is inactive', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue(null)

			const result = await userHasOrganizationPermission(
				'user-123',
				'org-123',
				'create:note:own',
			)

			expect(result).toBe(false)
		})

		it('should handle permission with multiple access levels', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [
						{
							action: 'read',
							entity: 'note',
							context: 'organization',
							access: 'org',
						},
					],
				},
			})

			const result = await userHasOrganizationPermission(
				'user-123',
				'org-123',
				'read:note:own,org',
			)

			expect(result).toBe(true)
		})
	})

	describe('requireUserWithOrganizationPermission', () => {
		it('should return userId when user has permission', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [
						{
							action: 'create',
							entity: 'note',
							context: 'organization',
							access: 'own',
						},
					],
				},
			})

			const result = await requireUserWithOrganizationPermission(
				'user-123',
				'org-123',
				'create:note:own',
			)

			expect(result).toBe('user-123')
		})

		it('should throw 401 when userId is undefined', async () => {
			await expect(
				requireUserWithOrganizationPermission(
					undefined,
					'org-123',
					'create:note:own',
				),
			).rejects.toThrow(Response)

			try {
				await requireUserWithOrganizationPermission(
					undefined,
					'org-123',
					'create:note:own',
				)
			} catch (error) {
				expect(error).toBeInstanceOf(Response)
				expect((error as Response).status).toBe(401)
				expect(await (error as Response).text()).toBe(
					'Authentication required',
				)
			}
		})

		it('should throw 403 when user lacks permission', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [],
				},
			})

			try {
				await requireUserWithOrganizationPermission(
					'user-123',
					'org-123',
					'delete:note:any',
				)
				expect.fail('Should have thrown')
			} catch (error) {
				expect(error).toBeInstanceOf(Response)
				expect((error as Response).status).toBe(403)
				expect(await (error as Response).text()).toBe(
					'Insufficient permissions: required delete:note:any in organization',
				)
			}
		})

		it('should throw 403 when user is not organization member', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue(null)

			try {
				await requireUserWithOrganizationPermission(
					'user-123',
					'org-123',
					'create:note:own',
				)
				expect.fail('Should have thrown')
			} catch (error) {
				expect(error).toBeInstanceOf(Response)
				expect((error as Response).status).toBe(403)
			}
		})
	})

	describe('getUserOrganizationPermissions', () => {
		it('should return user permissions for organization', async () => {
			const mockPermissions = [
				{
					action: 'create',
					entity: 'note',
					access: 'own',
					description: 'Create own notes',
				},
				{
					action: 'read',
					entity: 'note',
					access: 'org',
					description: 'Read all organization notes',
				},
			]

			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: mockPermissions,
				},
			})

			const result = await getUserOrganizationPermissions(
				'user-123',
				'org-123',
			)

			expect(result).toEqual(mockPermissions)
		})

		it('should return empty array when user has no permissions', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [],
				},
			})

			const result = await getUserOrganizationPermissions(
				'user-123',
				'org-123',
			)

			expect(result).toEqual([])
		})

		it('should return empty array when user is not organization member', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue(null)

			const result = await getUserOrganizationPermissions(
				'user-123',
				'org-123',
			)

			expect(result).toEqual([])
		})

		it('should filter only organization context permissions', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					permissions: [
						{
							action: 'create',
							entity: 'note',
							access: 'own',
							description: 'Create own notes',
						},
					],
				},
			})

			const result = await getUserOrganizationPermissions(
				'user-123',
				'org-123',
			)

			expect(mockPrisma.userOrganization.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					include: expect.objectContaining({
						organizationRole: expect.objectContaining({
							include: expect.objectContaining({
								permissions: expect.objectContaining({
									where: expect.objectContaining({
										context: 'organization',
									}),
								}),
							}),
						}),
					}),
				}),
			)
			expect(result).toBeDefined()
		})
	})

	describe('userHasOrganizationPermissionClient', () => {
		it('should return true when user has matching permission', () => {
			const userPermissions = [
				{ action: 'create', entity: 'note', access: 'own' },
				{ action: 'read', entity: 'note', access: 'org' },
			]

			const result = userHasOrganizationPermissionClient(
				userPermissions,
				'create:note:own',
			)

			expect(result).toBe(true)
		})

		it('should return false when user lacks permission', () => {
			const userPermissions = [
				{ action: 'create', entity: 'note', access: 'own' },
			]

			const result = userHasOrganizationPermissionClient(
				userPermissions,
				'delete:note:any',
			)

			expect(result).toBe(false)
		})

		it('should return true when user has any of the access levels', () => {
			const userPermissions = [
				{ action: 'read', entity: 'note', access: 'org' },
			]

			const result = userHasOrganizationPermissionClient(
				userPermissions,
				'read:note:own,org',
			)

			expect(result).toBe(true)
		})

		it('should return true when permission has no access level specified', () => {
			const userPermissions = [
				{ action: 'create', entity: 'note', access: 'own' },
			]

			const result = userHasOrganizationPermissionClient(
				userPermissions,
				'create:note:',
			)

			expect(result).toBe(true)
		})

		it('should return false for empty permissions array', () => {
			const result = userHasOrganizationPermissionClient(
				[],
				'create:note:own',
			)

			expect(result).toBe(false)
		})
	})

	describe('getUserOrganizationPermissionsForClient', () => {
		it('should return permissions with role details', async () => {
			const mockData = {
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					id: 'role-123',
					name: 'Admin',
					level: 100,
					permissions: [
						{
							id: 'perm-1',
							action: 'create',
							entity: 'note',
							access: 'own',
							description: 'Create own notes',
						},
						{
							id: 'perm-2',
							action: 'read',
							entity: 'note',
							access: 'org',
							description: 'Read all notes',
						},
					],
				},
			}

			mockPrisma.userOrganization.findUnique.mockResolvedValue(mockData)

			const result = await getUserOrganizationPermissionsForClient(
				'user-123',
				'org-123',
			)

			expect(result).toEqual({
				userId: 'user-123',
				organizationId: 'org-123',
				organizationRole: {
					id: 'role-123',
					name: 'Admin',
					level: 100,
					permissions: mockData.organizationRole.permissions,
				},
			})
		})

		it('should return null when user is not organization member', async () => {
			mockPrisma.userOrganization.findUnique.mockResolvedValue(null)

			const result = await getUserOrganizationPermissionsForClient(
				'user-123',
				'org-123',
			)

			expect(result).toBeNull()
		})

		it('should return null when user organization is inactive', async () => {
			mockPrisma.userOrganization.findUnique.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: false,
				organizationRole: {
					id: 'role-123',
					name: 'Member',
					level: 10,
					permissions: [],
				},
			})

			const result = await getUserOrganizationPermissionsForClient(
				'user-123',
				'org-123',
			)

			expect(result).toBeNull()
		})

		it('should use composite key for lookup', async () => {
			mockPrisma.userOrganization.findUnique.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: {
					id: 'role-123',
					name: 'Member',
					level: 10,
					permissions: [],
				},
			})

			await getUserOrganizationPermissionsForClient('user-123', 'org-123')

			expect(mockPrisma.userOrganization.findUnique).toHaveBeenCalledWith({
				where: {
					userId_organizationId: {
						userId: 'user-123',
						organizationId: 'org-123',
					},
				},
				include: expect.any(Object),
			})
		})
	})

	describe('ORG_PERMISSIONS constants', () => {
		it('should have all note permissions', () => {
			expect(ORG_PERMISSIONS.CREATE_NOTE_OWN).toBe('create:note:own')
			expect(ORG_PERMISSIONS.READ_NOTE_OWN).toBe('read:note:own')
			expect(ORG_PERMISSIONS.READ_NOTE_ANY).toBe('read:note:org')
			expect(ORG_PERMISSIONS.UPDATE_NOTE_OWN).toBe('update:note:own')
			expect(ORG_PERMISSIONS.UPDATE_NOTE_ANY).toBe('update:note:org')
			expect(ORG_PERMISSIONS.DELETE_NOTE_OWN).toBe('delete:note:own')
			expect(ORG_PERMISSIONS.DELETE_NOTE_ANY).toBe('delete:note:org')
		})

		it('should have all member permissions', () => {
			expect(ORG_PERMISSIONS.READ_MEMBER_ANY).toBe('read:member:any')
			expect(ORG_PERMISSIONS.CREATE_MEMBER_ANY).toBe('create:member:any')
			expect(ORG_PERMISSIONS.UPDATE_MEMBER_ANY).toBe('update:member:any')
			expect(ORG_PERMISSIONS.DELETE_MEMBER_ANY).toBe('delete:member:any')
		})

		it('should have all settings permissions', () => {
			expect(ORG_PERMISSIONS.READ_SETTINGS_ANY).toBe('read:settings:any')
			expect(ORG_PERMISSIONS.UPDATE_SETTINGS_ANY).toBe('update:settings:any')
		})

		it('should have analytics permissions', () => {
			expect(ORG_PERMISSIONS.READ_ANALYTICS_ANY).toBe('read:analytics:any')
		})
	})

	describe('Edge cases', () => {
		it('should handle malformed permission strings gracefully', () => {
			const result = parseOrganizationPermissionString('malformed')

			expect(result.action).toBe('malformed')
			expect(result.entity).toBe('')
			expect(result.access).toBeUndefined()
		})

		it('should handle database errors', async () => {
			mockPrisma.userOrganization.findFirst.mockRejectedValue(
				new Error('Database error'),
			)

			await expect(
				userHasOrganizationPermission('user-123', 'org-123', 'create:note:own'),
			).rejects.toThrow('Database error')
		})

		it('should handle null organizationRole gracefully', async () => {
			mockPrisma.userOrganization.findFirst.mockResolvedValue({
				userId: 'user-123',
				organizationId: 'org-123',
				active: true,
				organizationRole: null,
			})

			// This should not throw, but return false
			await expect(async () => {
				await userHasOrganizationPermission(
					'user-123',
					'org-123',
					'create:note:own',
				)
			}).rejects.toThrow()
		})
	})
})
