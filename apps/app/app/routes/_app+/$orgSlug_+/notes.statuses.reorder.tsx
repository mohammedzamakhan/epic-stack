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
		const newPosition = calculateReorderPosition(allStatuses, targetIndex)

		// Update the status with new position
		await tx.organizationNoteStatus.update({
			where: { id: statusId },
			data: { position: newPosition },
		})
	})

	return new Response(null, { status: 204 })
}
