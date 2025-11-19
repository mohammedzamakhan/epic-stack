import { calculateReorderPosition } from '@repo/common'
import { type ActionFunction } from 'react-router'
import { prisma } from '#app/utils/db.server.ts'
import { validateOrgAccess } from '#app/utils/organization-loader.server.ts'

export const action: ActionFunction = async ({ request, params }) => {
	const organization = await validateOrgAccess(request, params.orgSlug)

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

		// Calculate the new fractional position using shared utility
		const newPosition = calculateReorderPosition(
			allStatuses.map(s => ({ position: s.position ?? 0 })),
			targetIndex
		)

		// Update the status with new position
		await tx.organizationNoteStatus.update({
			where: { id: statusId },
			data: { position: newPosition },
		})
	})

	return new Response(null, { status: 204 })
}
