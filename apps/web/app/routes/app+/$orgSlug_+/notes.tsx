import { invariantResponse } from '@epic-web/invariant'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { type LoaderFunctionArgs } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'
import { NotesTable } from './notes-table.tsx'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug
	invariantResponse(orgSlug, 'Organization slug is required')

	const organization = await prisma.organization.findFirst({
		select: {
			id: true,
			name: true,
			slug: true,
			image: { select: { objectKey: true } },
		},
		where: { slug: orgSlug },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, organization.id)

	// Get organization notes with more details
	const notes = await prisma.organizationNote.findMany({
		select: {
			id: true,
			title: true,
			content: true,
			createdAt: true,
			updatedAt: true,
			images: {
				select: {
					id: true,
					altText: true,
					objectKey: true,
				},
			},
			createdBy: {
				select: {
					name: true,
					username: true,
				},
			},
		},
		where: {
			organizationId: organization.id
		},
		orderBy: {
			updatedAt: 'desc'
		},
	})

	const formattedNotes = notes.map(note => ({
		...note,
		createdByName: note.createdBy?.name || note.createdBy?.username || 'Unknown',
	}))

	return { 
		organization,
		notes: formattedNotes
	}
}

export default function NotesRoute({ loaderData }: { loaderData: { organization: { id: string, name: string, slug: string, image?: { objectKey: string } }, notes: Array<any> } }) {
	const orgName = loaderData.organization.name
	const [createSheetOpen, setCreateSheetOpen] = useState(false)

    const handleSuccess = () => {
        setCreateSheetOpen(false);
    }

	return (
		<div className="flex h-full flex-col m-8">
			<div className="flex justify-between items-center pb-4">
				<h1 className="text-3xl md:text-left">
					{orgName}'s Notes
				</h1>
				<Button variant="default" onClick={() => setCreateSheetOpen(true)}>
					<Icon name="plus">New Note</Icon>
				</Button>
			</div>

			<div className="flex-grow overflow-auto pb-4">
				{loaderData.notes.length > 0 ? (
					<NotesTable notes={loaderData.notes} />
				) : (
					<div className="flex flex-col items-center justify-center h-64 text-center">
						<p className="text-muted-foreground mb-4">No notes found</p>
						<Button variant="outline" onClick={() => setCreateSheetOpen(true)}>
							<Icon name="plus">Create your first note</Icon>
						</Button>
					</div>
				)}
			</div>

			{/* Create Note Sheet */}
			<Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
				<SheetContent className="w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-auto p-0">
					<SheetHeader className="p-6 pb-2 border-b">
						<SheetTitle className="text-xl font-semibold">Create New Note</SheetTitle>
					</SheetHeader>
					<div className="px-1">
						<OrgNoteEditor onSuccess={handleSuccess} />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No organization with the slug "{params.orgSlug}" exists</p>
				),
			}}
		/>
	)
}
