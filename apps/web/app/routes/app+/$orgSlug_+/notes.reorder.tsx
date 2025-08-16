import { type ActionFunction } from 'react-router'
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
	const position = Number(positionStr)

	// Validate statusId (if provided)
	if (statusId) {
		const statusRow = await prisma.organizationNoteStatus.findFirst({
			where: { id: statusId, organizationId: organization.id },
		})
		if (!statusRow) return new Response('Invalid statusId', { status: 400 })
	}

	// Use a transaction to properly reorder notes
	await prisma.$transaction(async (tx) => {
		// Get the note being moved
		const noteToMove = await tx.organizationNote.findFirst({
			where: { id: noteId, organizationId: organization.id },
			select: { id: true, statusId: true, position: true },
		})

		if (!noteToMove) {
			throw new Error('Note not found')
		}

		const oldStatusId = noteToMove.statusId
		const oldPosition = noteToMove.position ?? 0

		// Get all notes in the destination column, ordered by position
		const notesInDestColumn = await tx.organizationNote.findMany({
			where: {
				organizationId: organization.id,
				statusId: statusId,
				id: { not: noteId }, // Exclude the note being moved
			},
			select: { id: true, position: true },
			orderBy: { position: 'asc' },
		})

		// Calculate new positions
		const updates: Array<{ id: string; position: number }> = []

		// Insert the moved note at the specified position
		let currentPos = 0
		for (let i = 0; i < notesInDestColumn.length; i++) {
			if (currentPos === position) {
				// Insert moved note here
				updates.push({ id: noteId, position: currentPos })
				currentPos++
			}
			// Update existing note position
			const note = notesInDestColumn[i]
			if (note && note.id) {
				updates.push({ id: note.id, position: currentPos })
			}
			currentPos++
		}

		// If position is at the end, add the moved note
		if (position >= notesInDestColumn.length) {
			updates.push({ id: noteId, position: notesInDestColumn.length })
		}

		// If moving between columns, also reorder the old column
		if (oldStatusId !== statusId && oldStatusId !== null) {
			const notesInOldColumn = await tx.organizationNote.findMany({
				where: {
					organizationId: organization.id,
					statusId: oldStatusId,
					id: { not: noteId },
				},
				select: { id: true, position: true },
				orderBy: { position: 'asc' },
			})

			// Reorder old column (close the gap)
			notesInOldColumn.forEach((note, index) => {
				updates.push({ id: note.id, position: index })
			})
		}

		// Apply all updates
		for (const update of updates) {
			await tx.organizationNote.update({
				where: { id: update.id },
				data: {
					position: update.position,
					...(update.id === noteId ? { statusId } : {}),
				},
			})
		}
	})

	return new Response(null, { status: 204 })
}
