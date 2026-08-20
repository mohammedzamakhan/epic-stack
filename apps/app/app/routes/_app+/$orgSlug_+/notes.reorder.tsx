import { requireUserId } from '@repo/auth'
import { calculateReorderPosition } from '@repo/common'
import {
	and,
	asc,
	db,
	eq,
	isNull,
	ne,
	OrganizationNote,
	OrganizationNoteStatus,
} from '@repo/database'
import { type ActionFunction } from 'react-router'
import { validateOrgAccess } from '#app/utils/organization/loader.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'

export const action: ActionFunction = async ({ request, params }) => {
	const organization = await validateOrgAccess(request, params.orgSlug)
	const userId = await requireUserId(request)

	const formData = await request.formData()
	const noteId = formData.get('noteId')?.toString()
	const positionStr = formData.get('position')?.toString()
	const statusId = formData.get('statusId')?.toString() ?? null
	if (!noteId || !positionStr)
		return new Response('Missing fields', { status: 400 })
	const targetIndex = Number(positionStr)
	if (!Number.isInteger(targetIndex) || targetIndex < 0) {
		return new Response('Invalid position', { status: 400 })
	}

	const [noteToMove] = await db
		.select({
			id: OrganizationNote.id,
			createdById: OrganizationNote.createdById,
		})
		.from(OrganizationNote)
		.where(
			and(
				eq(OrganizationNote.id, noteId),
				eq(OrganizationNote.organizationId, organization.id),
			),
		)
		.limit(1)
	if (!noteToMove) return new Response('Note not found', { status: 404 })

	if (noteToMove.createdById === userId) {
		await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.UPDATE_NOTE_OWN,
		)
	} else {
		await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.UPDATE_NOTE_ANY,
		)
	}

	// Validate statusId (if provided)
	if (statusId) {
		const [statusRow] = await db
			.select({ id: OrganizationNoteStatus.id })
			.from(OrganizationNoteStatus)
			.where(
				and(
					eq(OrganizationNoteStatus.id, statusId),
					eq(OrganizationNoteStatus.organizationId, organization.id),
				),
			)
			.limit(1)
		if (!statusRow) return new Response('Invalid statusId', { status: 400 })
	}

	// Use a transaction to calculate and update position
	await db.transaction(async (tx) => {
		// Get the note being moved
		const [noteToMove] = await tx
			.select({
				id: OrganizationNote.id,
				statusId: OrganizationNote.statusId,
				position: OrganizationNote.position,
			})
			.from(OrganizationNote)
			.where(
				and(
					eq(OrganizationNote.id, noteId),
					eq(OrganizationNote.organizationId, organization.id),
				),
			)
			.limit(1)

		if (!noteToMove) {
			throw new Error('Note not found')
		}

		// Get all notes in the destination column (excluding the note being moved)
		const notesInDestColumn = await tx
			.select({ id: OrganizationNote.id, position: OrganizationNote.position })
			.from(OrganizationNote)
			.where(
				and(
					eq(OrganizationNote.organizationId, organization.id),
					statusId
						? eq(OrganizationNote.statusId, statusId)
						: isNull(OrganizationNote.statusId),
					ne(OrganizationNote.id, noteId),
				),
			)
			.orderBy(asc(OrganizationNote.position))

		// Calculate the new fractional position using shared utility
		const newPosition = calculateReorderPosition(
			notesInDestColumn.map((n) => ({ position: n.position ?? 0 })),
			targetIndex,
		)

		// Update the note with new position and status
		await tx
			.update(OrganizationNote)
			.set({
				position: newPosition,
				statusId: statusId,
			})
			.where(eq(OrganizationNote.id, noteId))
	})

	return new Response(null, { status: 204 })
}
