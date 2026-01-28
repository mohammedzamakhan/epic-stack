import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { lazy, Suspense } from 'react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

// Lazy load the heavy rich text editor
const OrgNoteEditor = lazy(() =>
	import('./__org-note-editor.tsx').then((m) => ({ default: m.OrgNoteEditor })),
)

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
				<Suspense
					fallback={
						<div className="flex flex-1 items-center justify-center">
							<div className="bg-muted/50 h-48 w-full animate-pulse rounded-lg" />
						</div>
					}
				>
					<OrgNoteEditor
						note={loaderData.note}
						actionData={actionData}
						organizationId={loaderData.organizationId}
					/>
				</Suspense>
			</section>
		</>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => {
					const noteId = params.noteId
					return (
						<p>
							<Trans>No note with the id "{noteId}" exists</Trans>
						</p>
					)
				},
			}}
		/>
	)
}
