import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const orgSlug = params.orgSlug
	if (!orgSlug) return new Response('Missing orgSlug', { status: 400 })

	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})
	if (!organization)
		return new Response('Organization not found', { status: 404 })

	await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	const formData = await request.formData()
	const name = formData.get('name')?.toString().trim()
	const color = formData.get('color')?.toString().trim() || '#6b7280'
	if (!name) return new Response('Missing name', { status: 400 })

	// Prevent duplicate status names in org
	const existing = await prisma.organizationNoteStatus.findFirst({
		where: { organizationId: organization.id, name },
	})
	if (existing) return new Response('Already exists', { status: 409 })

	// Determine next position
	const maxPos = await prisma.organizationNoteStatus.aggregate({
		where: { organizationId: organization.id },
		_max: { position: true },
	})
	const nextPosition = (maxPos._max.position ?? 0) + 1

	const created = await prisma.organizationNoteStatus.create({
		data: {
			organizationId: organization.id,
			name,
			color,
			position: nextPosition,
		},
		select: { id: true, name: true, color: true, position: true },
	})

	return Response.json(created)
}
