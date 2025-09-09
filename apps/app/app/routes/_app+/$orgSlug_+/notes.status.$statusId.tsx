import { type ActionFunction } from 'react-router'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export const action: ActionFunction = async ({ request, params }) => {
	const orgSlug = params.orgSlug
	const statusId = params.statusId
	if (!orgSlug || !statusId)
		return new Response('Missing params', { status: 400 })
	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})
	if (!organization)
		return new Response('Organization not found', { status: 404 })
	await userHasOrgAccess(request, organization.id)

	if (request.method === 'PATCH') {
		const formData = await request.formData()
		const name = formData.get('name')?.toString().trim()
		const color = formData.get('color')?.toString().trim()
		if (!name) return new Response('Missing name', { status: 400 })

		// Check for duplicate name
		const existing = await prisma.organizationNoteStatus.findFirst({
			where: { organizationId: organization.id, name, id: { not: statusId } },
		})
		if (existing) return new Response('Name already exists', { status: 409 })

		const updateData: { name: string; color?: string } = { name }
		if (color) updateData.color = color

		const updated = await prisma.organizationNoteStatus.update({
			where: { id: statusId, organizationId: organization.id },
			data: updateData,
			select: { id: true, name: true, color: true, position: true },
		})

		return Response.json(updated)
	} else if (request.method === 'DELETE') {
		await prisma.$transaction([
			prisma.organizationNote.updateMany({
				where: { statusId: statusId, organizationId: organization.id },
				data: { statusId: null },
			}),
			prisma.organizationNoteStatus.delete({
				where: { id: statusId, organizationId: organization.id },
			}),
		])
		return new Response('OK', { status: 200 })
	}

	return new Response('Method Not Allowed', { status: 405 })
}
