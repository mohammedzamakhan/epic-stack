import { type ActionFunction } from 'react-router'
import { calculateReorderPosition } from '@repo/common'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export const action: ActionFunction = async ({ request, params }) => {
	const orgSlug = params.orgSlug
	if (!orgSlug) return new Response('Missing orgSlug', { status: 400 })
	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})
	if (!organization)
		return new Response('Organization not found', { status: 404 })
	await userHasOrgAccess(request, organization.id)

	const formData = await request.formData()
	const noteId = formData.get('noteId')?.toString()
	const positionStr = formData.get('position')?.toString()
	const statusId = formData.get('statusId')?.toString() ?? null
	if (!noteId || !positionStr)
		return new Response('Missing fields', { status: 400 })
	const targetIndex = Number(positionStr)

	// Validate statusId (if provided)
	if (statusId) {
		const statusRow = await prisma.organizationNoteStatus.findFirst({
			where: { id: statusId, organizationId: organization.id },
		})
		if (!statusRow) return new Response('Invalid statusId', { status: 400 })
	}

	// Use a transaction to calculate and update position
	await prisma.$transaction(async (tx) => {
		// Get the note being moved
		const noteToMove = await tx.organizationNote.findFirst({
			where: { id: noteId, organizationId: organization.id },
			select: { id: true, statusId: true, position: true },
		})

		if (!noteToMove) {
			throw new Error('Note not found')
		}

		// Get all notes in the destination column (excluding the note being moved)
		const notesInDestColumn = await tx.organizationNote.findMany({
			where: {
				organizationId: organization.id,
				statusId: statusId,
				id: { not: noteId }, // Exclude the note being moved
			},
			select: { id: true, position: true },
			orderBy: { position: 'asc' },
		})

		// Calculate the new fractional position using shared utility
		const newPosition = calculateReorderPosition(notesInDestColumn, targetIndex)

		// Update the note with new position and status
		await tx.organizationNote.update({
			where: { id: noteId },
			data: {
				position: newPosition,
				statusId: statusId,
			},
		})
	})

	return new Response(null, { status: 204 })
}
