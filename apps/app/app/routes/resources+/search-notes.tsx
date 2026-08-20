import { invariantResponse } from '@epic-web/invariant'
import { requireUserId } from '@repo/auth'
import { and, db, eq, like, Organization } from '@repo/database'
import { type LoaderFunctionArgs } from 'react-router'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const orgSlug = url.searchParams.get('orgSlug')
	const query = url.searchParams.get('q') || ''

	invariantResponse(orgSlug, 'Organization slug is required')

	const [organization] = await db
		.select({ id: Organization.id })
		.from(Organization)
		.where(eq(Organization.slug, orgSlug))
		.limit(1)

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, organization.id)

	// Search notes
	const notes = await db.query.OrganizationNote.findMany({
		columns: {
			id: true,
			title: true,
			content: true,
			createdAt: true,
			updatedAt: true,
			createdById: true,
			isPublic: true,
		},
		with: {
			user: { columns: { name: true, username: true } },
			noteAccess: { columns: { userId: true } },
		},
		where: (note, operators) =>
			and(
				eq(note.organizationId, organization.id),
				query
					? operators.or(
							like(note.title, `%${query}%`),
							like(note.content, `%${query}%`),
						)
					: undefined,
			),
		orderBy: (note, { desc }) => [desc(note.updatedAt)],
		limit: 100,
	})

	const formattedNotes = notes
		.filter(
			(note) =>
				note.isPublic ||
				note.createdById === userId ||
				note.noteAccess.some((access) => access.userId === userId),
		)
		.slice(0, 10)
		.map((note) => ({
			id: note.id,
			title: note.title,
			content:
				note.content.substring(0, 100) +
				(note.content.length > 100 ? '...' : ''),
			createdAt: note.createdAt.toISOString(),
			updatedAt: note.updatedAt.toISOString(),
			createdByName: note.user?.name || note.user?.username || 'Unknown',
		}))

	return Response.json({ notes: formattedNotes })
}
