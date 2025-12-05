import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { prisma } from '@repo/database'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
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
			priority: true,
			tags: true,
			uploads: {
				select: {
					id: true,
					type: true,
					altText: true,
					objectKey: true,
					thumbnailKey: true,
					status: true,
				},
			},
		},
		where: {
			id: params.noteId,
			organizationId: organization.id,
		},
	})
	invariantResponse(note, 'Not found', { status: 404 })
	return { note, organizationId: organization.id }
}

type NoteEditProps = {
	loaderData: {
		note: {
			id: string
			title: string
			content: string
			priority?: string | null
			tags?: string | null
			uploads: Array<{
				id: string
				type: string
				altText: string | null
				objectKey: string
				thumbnailKey: string | null
				status: string
			}>
		}
		organizationId: string
	}
	actionData?: { result: any }
}

export default function NoteEdit({ loaderData, actionData }: NoteEditProps) {
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>
					<Trans>Edit Note</Trans>
				</SheetTitle>
			</SheetHeader>

			<section
				className="flex min-h-0 flex-1 flex-col"
				aria-labelledby="edit-note-title"
				tabIndex={-1}
			>
				<OrgNoteEditor
					note={loaderData.note}
					actionData={actionData}
					organizationId={loaderData.organizationId}
				/>
			</section>
		</>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>
						<Trans>No note with the id "{params.noteId}" exists</Trans>
					</p>
				),
			}}
		/>
	)
}
