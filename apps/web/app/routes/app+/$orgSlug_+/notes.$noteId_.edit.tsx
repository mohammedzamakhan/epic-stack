import { invariantResponse } from '@epic-web/invariant'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'

export { action } from './__org-note-editor.server.tsx'

export async function loader({
	params,
	request,
}: {
	params: { orgSlug: string; noteId: string }
	request: Request
}) {
	await requireUserId(request)
	const orgSlug = params.orgSlug

	// Get the organization ID
	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug },
		select: { id: true },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, organization.id)

	const note = await prisma.organizationNote.findFirst({
		select: {
			id: true,
			title: true,
			content: true,
			images: {
				select: {
					id: true,
					altText: true,
					objectKey: true,
				},
			},
		},
		where: {
			id: params.noteId,
			organizationId: organization.id,
		},
	})
	invariantResponse(note, 'Not found', { status: 404 })
	return { note }
}

type NoteEditProps = {
	loaderData: {
		note: {
			id: string
			title: string
			content: string
			images: Array<{
				id: string
				altText: string | null
				objectKey: string
			}>
		}
	}
	actionData?: { result: any }
}

export default function NoteEdit({ loaderData, actionData }: NoteEditProps) {
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>Edit Note</SheetTitle>
			</SheetHeader>
			<OrgNoteEditor note={loaderData.note} actionData={actionData} />
		</>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
