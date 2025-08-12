import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'
import { prisma } from '@repo/prisma'
import { invariantResponse } from '@epic-web/invariant'

export { action } from './__org-note-editor.server.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const orgSlug = params.orgSlug

	// Get the organization ID
	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug },
		select: { id: true },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	return { organizationId: organization.id }
}

export default function NewNote() {
	const { organizationId } = useLoaderData<typeof loader>()
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>Create New Note</SheetTitle>
			</SheetHeader>

			<section
				className="flex min-h-0 flex-1 flex-col"
				aria-labelledby="new-note-title"
				tabIndex={-1}
			>
				<OrgNoteEditor organizationId={organizationId} />
			</section>
		</>
	)
}
