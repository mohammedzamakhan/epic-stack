import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { prisma } from '@repo/prisma'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'

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
				<SheetTitle>
					<Trans>Create New Note</Trans>
				</SheetTitle>
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
