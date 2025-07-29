import { invariantResponse } from '@epic-web/invariant'
import { Files, FileText, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	Outlet,
	Link,
	useLocation,
	useNavigate,
	type LoaderFunctionArgs,
} from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { PageTitle } from '#app/components/ui/page-title.tsx'
import { Sheet, SheetContent } from '#app/components/ui/sheet.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
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
	const userId = await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	// Get organization notes with access control
	const notes = await prisma.organizationNote.findMany({
		select: {
			id: true,
			title: true,
			content: true,
			createdAt: true,
			updatedAt: true,
			isPublic: true,
			createdById: true,
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
			noteAccess: {
				select: {
					userId: true,
				},
			},
		},
		where: {
			organizationId: organization.id,
			OR: [
				{ isPublic: true },
				{ createdById: userId },
				{ noteAccess: { some: { userId } } },
			],
		},
		orderBy: {
			updatedAt: 'desc',
		},
	})

	const formattedNotes = notes.map((note) => ({
		...note,
		createdByName:
			note.createdBy?.name || note.createdBy?.username || 'Unknown',
	}))

	return {
		organization,
		notes: formattedNotes,
	}
}

export default function NotesRoute({
	loaderData,
}: {
	loaderData: {
		organization: {
			id: string
			name: string
			slug: string
			image?: { objectKey: string }
		}
		notes: Array<any>
	}
}) {
	const orgName = loaderData.organization.name
	const location = useLocation()
	const [hasOutlet, setHasOutlet] = useState(false)
	const navigate = useNavigate()

	// Simple check: if we're not on the base notes route, show outlet
	useEffect(() => {
		const baseNotesPath = `/app/${loaderData.organization.slug}/notes`
		setHasOutlet(location.pathname !== baseNotesPath)
	}, [location.pathname, loaderData.organization.slug])

	return (
		<div className="m-8 flex h-full flex-col">
			<div className="flex items-center justify-between pb-4">
				<PageTitle
					title={`${orgName}'s Notes`}
					description="You can create notes for your organization here."
				/>
				<Button variant="default" asChild>
					<Link to="new">
						<Icon name="plus">New Note</Icon>
					</Link>
				</Button>
			</div>

			<div className="flex-grow overflow-auto pb-4">
				{loaderData.notes.length > 0 ? (
					<NotesTable notes={loaderData.notes} />
				) : (
					<>
						<EmptyState
							title="You haven't created any notes yet!"
							description="Notes help you capture thoughts, meeting minutes, or anything
							important for your organization. Get started by creating your
							first note."
							icons={[FileText, Link2, Files]}
							action={{
								label: 'Create Note',
								href: `/app/${loaderData.organization.slug}/notes/new`,
							}}
						/>
					</>
				)}
			</div>

			{/* Sheet for nested routes */}
			<Sheet
				open={hasOutlet}
				onOpenChange={() => {
					if (hasOutlet) {
						// Navigate back to notes list
						void navigate(`/app/${loaderData.organization.slug}/notes`)
					}
				}}
			>
				<SheetContent className="w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl flex flex-col gap-0">
					<Outlet />
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
