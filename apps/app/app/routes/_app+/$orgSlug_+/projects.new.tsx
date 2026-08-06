import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { ProjectEditor } from './__project-editor.tsx'

export { action } from './__project-editor.server.tsx'

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

export default function NewProject() {
	const { organizationId } = useLoaderData<typeof loader>()
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>
					<Trans>Create New Project</Trans>
				</SheetTitle>
			</SheetHeader>

			<section
				className="flex min-h-0 flex-1 flex-col"
				aria-labelledby="new-project-title"
				tabIndex={-1}
			>
				<ProjectEditor organizationId={organizationId} />
			</section>
		</>
	)
}
