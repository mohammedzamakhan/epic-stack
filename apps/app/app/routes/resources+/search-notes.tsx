import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const orgSlug = url.searchParams.get('orgSlug')
	const query = url.searchParams.get('q') || ''

	invariantResponse(orgSlug, 'Organization slug is required')

	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, organization.id)

	// Search notes
	const notes = await prisma.organizationNote.findMany({
		select: {
			id: true,
			title: true,
			content: true,
			createdAt: true,
			updatedAt: true,
			createdBy: {
				select: {
					name: true,
					username: true,
				},
			},
		},
		where: {
			organizationId: organization.id,
			OR: [
				{ isPublic: true },
				{ createdById: userId },
				{ noteAccess: { some: { userId } } },
			],
			AND: query
				? {
						OR: [
							{ title: { contains: query } },
							{ content: { contains: query } },
						],
					}
				: {},
		},
		orderBy: {
			updatedAt: 'desc',
		},
		take: 10, // Limit results for performance
	})

	const formattedNotes = notes.map((note) => ({
		id: note.id,
		title: note.title,
		content:
			note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
		createdAt: note.createdAt.toISOString(),
		updatedAt: note.updatedAt.toISOString(),
		createdByName:
			note.createdBy?.name || note.createdBy?.username || 'Unknown',
	}))

	return Response.json({ notes: formattedNotes })
}
