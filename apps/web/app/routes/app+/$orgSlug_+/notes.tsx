import { invariantResponse } from '@epic-web/invariant'
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
import { NotesCards } from './notes-cards.tsx'

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
			status: true,
			position: true,
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
		orderBy: [
			{ status: 'asc' },
			{ position: 'asc' },
			{ updatedAt: 'desc' },
		],
	})

	const formattedNotes = notes.map((note) => ({
		...note,
		createdByName:
			note.createdBy?.name || note.createdBy?.username || 'Unknown',
		status: note.status ?? null,
		position: note.position ?? null,
	}))

	return {
		organization,
		notes: formattedNotes,
	}
}

import { ToggleGroup, ToggleGroupItem } from '#app/components/ui/toggle-group.tsx'
import { NotesKanbanBoard } from './notes-kanban-board.tsx'

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
		notes: Array<{
			id: string
			title: string
			content: string
			createdAt: string
			updatedAt: string
			isPublic: boolean
			createdById: string
			status?: string | null
			position?: number | null
			uploads?: Array<{
				id: string
				type: string
				altText: string | null
				objectKey: string
				thumbnailKey?: string | null
				status?: string
			}>
			createdBy?: {
				name: string | null
				username: string | null
			} | null
			noteAccess: Array<{
				userId: string
			}>
			createdByName: string
		}>
	}
}) {
	const orgName = loaderData.organization.name
	const location = useLocation()
	const [hasOutlet, setHasOutlet] = useState(false)
	const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards')
	const navigate = useNavigate()

	// Simple check: if we're not on the base notes route, show outlet
	useEffect(() => {
		const baseNotesPath = `/app/${loaderData.organization.slug}/notes`
		setHasOutlet(location.pathname !== baseNotesPath)
	}, [location.pathname, loaderData.organization.slug])

	return (
		<div className="m-8 flex h-full flex-col">
			<div className="flex items-center justify-between pb-8">
				<div className="flex items-center gap-4">
					<PageTitle
						title={`Notes`}
						description="You can create notes for your organization here."
					/>
					<ToggleGroup
						type="single"
						value={viewMode}
						onValueChange={val => {
							if (val === 'cards' || val === 'kanban') setViewMode(val)
						}}
						className="ml-4"
					>
						<ToggleGroupItem value="cards" aria-label="Cards view">
							Cards
						</ToggleGroupItem>
						<ToggleGroupItem value="kanban" aria-label="Kanban board">
							Kanban
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<Button variant="default" asChild>
					<Link to="new">
						<Icon name="plus">New Note</Icon>
					</Link>
				</Button>
			</div>

			<div className="flex-grow overflow-auto pb-4">
				{loaderData.notes.length > 0 ? (
					viewMode === 'kanban' ? (
						<NotesKanbanBoard
							notes={loaderData.notes}
							orgSlug={loaderData.organization.slug}
						/>
					) : (
						<NotesCards notes={loaderData.notes} />
					)
				) : (
					<>
						<EmptyState
							title="You haven't created any notes yet!"
							description="Notes help you capture thoughts, meeting minutes, or anything
							important for your organization. Get started by creating your
							first note."
							icons={['file-text', 'link-2', 'image']}
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
				<SheetContent className="flex w-[90vw] flex-col gap-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
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
