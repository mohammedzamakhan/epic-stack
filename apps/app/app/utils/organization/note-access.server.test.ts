import { db, NoteAccess, UserOrganization } from '@repo/database'
import { describe, expect, it } from 'vitest'
import {
	createTestNote,
	createTestUser,
	setupTestOrgWithUser,
} from '#tests/test-utils.ts'
import { getAccessibleNotes, userCanAccessNote } from './note-access.server.ts'

describe('organization note-access.server integration', () => {
	describe('userCanAccessNote', () => {
		it('allows access to public notes for any organization member', async () => {
			const { user, organization } = await setupTestOrgWithUser('member')

			const canAccess = await userCanAccessNote(user.id, organization.id, {
				isPublic: true,
				createdById: 'some-other-user',
			})

			expect(canAccess).toBe(true)
		})

		it('allows author to access their own private note', async () => {
			const { user, organization } = await setupTestOrgWithUser('member')

			const canAccess = await userCanAccessNote(user.id, organization.id, {
				isPublic: false,
				createdById: user.id,
			})

			expect(canAccess).toBe(true)
		})

		it('allows admin to access private notes via org-wide read permission', async () => {
			const { user: admin, organization } = await setupTestOrgWithUser('admin')

			const canAccess = await userCanAccessNote(admin.id, organization.id, {
				isPublic: false,
				createdById: 'some-other-user',
			})

			expect(canAccess).toBe(true)
		})

		it('denies access to private note for guest without explicit access', async () => {
			const { organization } = await setupTestOrgWithUser('admin')

			const guest = await createTestUser()
			await db.insert(UserOrganization).values({
				userId: guest.id,
				organizationId: organization.id,
				organizationRoleId: 'org_role_guest',
				active: true,
			})

			const canAccess = await userCanAccessNote(guest.id, organization.id, {
				isPublic: false,
				createdById: 'another-user',
				noteAccess: [],
			})

			expect(canAccess).toBe(false)
		})

		it('allows access to private note when explicit NoteAccess is granted', async () => {
			const { organization } = await setupTestOrgWithUser('admin')

			const guest = await createTestUser()
			await db.insert(UserOrganization).values({
				userId: guest.id,
				organizationId: organization.id,
				organizationRoleId: 'org_role_guest',
				active: true,
			})

			const canAccess = await userCanAccessNote(guest.id, organization.id, {
				isPublic: false,
				createdById: 'another-user',
				noteAccess: [{ userId: guest.id }],
			})

			expect(canAccess).toBe(true)
		})
	})

	describe('getAccessibleNotes', () => {
		it('returns public notes and owned notes for guest member, hiding other private notes', async () => {
			const { organization } = await setupTestOrgWithUser('admin')

			const guest = await createTestUser()
			await db.insert(UserOrganization).values({
				userId: guest.id,
				organizationId: organization.id,
				organizationRoleId: 'org_role_guest',
				active: true,
			})

			// Note 1: Public note created by someone else
			const otherUser = await createTestUser()
			await createTestNote(organization.id, otherUser.id, {
				title: 'Public Knowledge Base',
				isPublic: true,
			})

			// Note 2: Private note owned by guest
			await createTestNote(organization.id, guest.id, {
				title: 'My Private Brainstorm',
				isPublic: false,
			})

			// Note 3: Private note owned by other user (not accessible to guest)
			await createTestNote(organization.id, otherUser.id, {
				title: 'Secret Board Deck',
				isPublic: false,
			})

			const accessibleNotes = await getAccessibleNotes(
				guest.id,
				organization.id,
			)

			const titles = accessibleNotes.map((n) => n.title)
			expect(titles).toContain('Public Knowledge Base')
			expect(titles).toContain('My Private Brainstorm')
			expect(titles).not.toContain('Secret Board Deck')
		})

		it('returns shared private note when NoteAccess record exists', async () => {
			const { organization } = await setupTestOrgWithUser('admin')

			const guest = await createTestUser()
			await db.insert(UserOrganization).values({
				userId: guest.id,
				organizationId: organization.id,
				organizationRoleId: 'org_role_guest',
				active: true,
			})
			const author = await createTestUser()

			const sharedNote = await createTestNote(organization.id, author.id, {
				title: 'Shared Project Brief',
				isPublic: false,
			})

			// Share with guest in NoteAccess table
			await db.insert(NoteAccess).values({
				noteId: sharedNote.id,
				userId: guest.id,
			})

			const accessibleNotes = await getAccessibleNotes(
				guest.id,
				organization.id,
			)

			const titles = accessibleNotes.map((n) => n.title)
			expect(titles).toContain('Shared Project Brief')
		})
	})
})
