import { json } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export const action = async ({ request, params }) => {
	const orgSlug = params.orgSlug
	if (!orgSlug) return new Response('Missing orgSlug', { status: 400 })

	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})
	if (!organization) return new Response('Organization not found', { status: 404 })

	const userId = await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	const { noteId, status, position } = await request.json()
	if (!noteId || typeof position !== 'number') {
		return new Response('Missing fields', { status: 400 })
	}

	const updated = await prisma.organizationNote.updateMany({
		where: {
			id: noteId,
			organizationId: organization.id,
		},
		data: {
			status: status ?? null,
			position,
		},
	})

	if (updated.count === 0) {
		return new Response('Note not found or not in org', { status: 404 })
	}

	return new Response(null, { status: 204 })
}