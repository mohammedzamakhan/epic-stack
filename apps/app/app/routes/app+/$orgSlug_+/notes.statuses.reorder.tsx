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
	const statusId = formData.get('statusId')?.toString()
	const positionStr = formData.get('position')?.toString()

	if (!statusId || !positionStr)
		return new Response('Missing fields', { status: 400 })

	const targetIndex = Number(positionStr)

	// Validate statusId
	const statusToMove = await prisma.organizationNoteStatus.findFirst({
		where: { id: statusId, organizationId: organization.id },
	})
	if (!statusToMove) return new Response('Status not found', { status: 404 })

	// Use a transaction to calculate and update position
	await prisma.$transaction(async (tx) => {
		// Get all statuses in the organization (excluding the one being moved)
		const allStatuses = await tx.organizationNoteStatus.findMany({
			where: {
				organizationId: organization.id,
				id: { not: statusId },
			},
			select: { id: true, position: true },
			orderBy: { position: 'asc' },
		})

		// Calculate the new fractional position
		let newPosition: number

		if (allStatuses.length === 0) {
			// Only one status, use position 1.0
			newPosition = 1.0
		} else if (targetIndex <= 0) {
			// Insert at beginning
			const firstStatus = allStatuses[0]
			newPosition = getFractionalPosition(null, firstStatus?.position ?? null)
		} else if (targetIndex >= allStatuses.length) {
			// Insert at end
			const lastStatus = allStatuses[allStatuses.length - 1]
			newPosition = getFractionalPosition(lastStatus?.position ?? null, null)
		} else {
			// Insert between two statuses
			const prevStatus = allStatuses[targetIndex - 1]
			const nextStatus = allStatuses[targetIndex]
			newPosition = getFractionalPosition(
				prevStatus?.position ?? null,
				nextStatus?.position ?? null,
			)
		}

		// Update the status with new position
		await tx.organizationNoteStatus.update({
			where: { id: statusId },
			data: { position: newPosition },
		})
	})

	return new Response(null, { status: 204 })
}
