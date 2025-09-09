import { type ActionFunction } from 'react-router'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

// Helper function to calculate fractional position
function getFractionalPosition(
	prevPosition: number | null,
	nextPosition: number | null,
): number {
	if (prevPosition === null && nextPosition === null) {
		return 1.0 // First item
	} else if (prevPosition === null) {
		return nextPosition! - 1.0 // Insert at beginning
	} else if (nextPosition === null) {
		return prevPosition + 1.0 // Insert at end
	} else {
		return (prevPosition + nextPosition) / 2.0 // Insert between
	}
}

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

		// Calculate the new fractional position
		let newPosition: number

		if (notesInDestColumn.length === 0) {
			// Empty column, use position 1.0
			newPosition = 1.0
		} else if (targetIndex <= 0) {
			// Insert at beginning
			const firstNote = notesInDestColumn[0]
			newPosition = getFractionalPosition(null, firstNote?.position ?? null)
		} else if (targetIndex >= notesInDestColumn.length) {
			// Insert at end
			const lastNote = notesInDestColumn[notesInDestColumn.length - 1]
			newPosition = getFractionalPosition(lastNote?.position ?? null, null)
		} else {
			// Insert between two notes
			const prevNote = notesInDestColumn[targetIndex - 1]
			const nextNote = notesInDestColumn[targetIndex]
			newPosition = getFractionalPosition(
				prevNote?.position ?? null,
				nextNote?.position ?? null,
			)
		}

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
