import { userHasOrganizationPermission, ORG_PERMISSIONS } from '@repo/auth'
import { prisma } from '@repo/database'

/**
 * Build the Prisma where clause for notes that a user can access.
 *
 * Access is granted if:
 * 1. The user has organization-wide read permission (READ_NOTE_ANY)
 * 2. OR the note is public
 * 3. OR the user owns the note
 * 4. OR the user has been granted explicit access via NoteAccess
 *
 * @param userId - The ID of the user requesting access
 * @param organizationId - The organization ID
 * @returns Prisma where condition for note access
 */
export async function buildNoteAccessCondition(
	userId: string,
	organizationId: string,
): Promise<{ OR: Array<Record<string, unknown>> }> {
	const hasOrgWideReadAccess = await userHasOrganizationPermission(
		userId,
		organizationId,
		ORG_PERMISSIONS.READ_NOTE_ANY,
	)

	if (hasOrgWideReadAccess) {
		return {
			OR: [{ organizationId }],
		}
	}

	return {
		OR: [
			{ isPublic: true },
			{ createdById: userId },
			{ noteAccess: { some: { userId } } },
		],
	}
}

/**
 * Check if a user can access a specific note.
 *
 * Uses the centralized permission system to determine access:
 * 1. Users with READ_NOTE_ANY can access all organization notes
 * 2. Public notes are accessible to all org members
 * 3. Note owners can always access their notes
 * 4. Users with explicit NoteAccess can access shared notes
 *
 * @param userId - The ID of the user requesting access
 * @param organizationId - The organization ID
 * @param note - The note object to check access for
 * @returns true if user can access the note
 */
export async function userCanAccessNote(
	userId: string,
	organizationId: string,
	note: {
		isPublic: boolean
		createdById: string
		noteAccess?: Array<{ userId: string }>
	},
): Promise<boolean> {
	if (note.isPublic) {
		return true
	}

	if (note.createdById === userId) {
		return true
	}

	const hasOrgWideReadAccess = await userHasOrganizationPermission(
		userId,
		organizationId,
		ORG_PERMISSIONS.READ_NOTE_ANY,
	)

	if (hasOrgWideReadAccess) {
		return true
	}

	if (note.noteAccess?.some((access) => access.userId === userId)) {
		return true
	}

	return false
}

/**
 * Get accessible notes for a user within an organization.
 *
 * This centralizes the note access query logic using the permission system.
 *
 * @param userId - The ID of the requesting user
 * @param organizationId - The organization ID
 * @param options - Query options
 * @returns Array of accessible notes
 */
export async function getAccessibleNotes(
	userId: string,
	organizationId: string,
	options: {
		targetUserId?: string
		take?: number
		orderBy?: Record<string, 'asc' | 'desc'>
	} = {},
) {
	const { targetUserId, take = 10, orderBy = { createdAt: 'desc' } } = options
	const accessCondition = await buildNoteAccessCondition(userId, organizationId)

	const where: Record<string, unknown> = {
		organizationId,
		...accessCondition,
	}

	if (targetUserId) {
		where.createdById = targetUserId
	}

	return prisma.organizationNote.findMany({
		where,
		select: {
			id: true,
			title: true,
			content: true,
			createdAt: true,
			isPublic: true,
			createdById: true,
		},
		take,
		orderBy,
	})
}
