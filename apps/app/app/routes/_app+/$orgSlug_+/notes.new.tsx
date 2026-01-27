import { Trans } from '@lingui/macro'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'

export { action } from './__org-note-editor.server.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	// Verify user is authenticated AND is a member of the organization
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
	})

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
