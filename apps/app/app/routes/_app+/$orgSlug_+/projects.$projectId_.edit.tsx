import { invariantResponse } from '@epic-web/invariant'
import { Trans } from '@lingui/macro'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { SheetHeader, SheetTitle } from '@repo/ui/sheet'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'
import { ProjectEditor } from './__project-editor.tsx'

export { action } from './__project-editor.server.tsx'

export async function loader({
	params,
	request,
}: {
	params: { orgSlug: string; projectId: string }
	request: Request
}) {
	await requireUserId(request)
	const orgSlug = params.orgSlug
	const projectId = params.projectId

	// Get the organization ID
	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug },
		select: { id: true },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	await userHasOrgAccess(request, organization.id)

	const project = await prisma.project.findFirst({
		select: {
			id: true,
			name: true,
			description: true,
			color: true,
		},
		where: {
			id: projectId,
			organizationId: organization.id,
		},
	})
	invariantResponse(project, 'Not found', { status: 404 })
	return { project, organizationId: organization.id }
}

type ProjectEditProps = {
	loaderData: {
		project: {
			id: string
			name: string
			description: string | null
			color: string
		}
		organizationId: string
	}
	actionData?: { result: any }
}

export default function ProjectEdit({
	loaderData,
	actionData,
}: ProjectEditProps) {
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>
					<Trans>Edit Project</Trans>
				</SheetTitle>
			</SheetHeader>

			<section
				className="flex min-h-0 flex-1 flex-col"
				aria-labelledby="edit-project-title"
				tabIndex={-1}
			>
				<ProjectEditor
					project={loaderData.project}
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
						<Trans>No project with the id "{params.projectId}" exists</Trans>
					</p>
				),
			}}
		/>
	)
}
