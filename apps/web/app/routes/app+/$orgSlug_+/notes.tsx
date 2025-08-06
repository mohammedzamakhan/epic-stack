import { invariantResponse } from '@epic-web/invariant'
import { useEffect, useState } from 'react'
import {
	Outlet,
	Link,
	useLocation,
	useNavigate,
	useFetcher,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
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
import { getNotesViewMode, setNotesViewMode } from '#app/utils/notes-view-cookie.server.ts'
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
			statusId: true,
			status: { select: { id: true, name: true } },
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
			{ statusId: 'asc' },
			{ position: 'asc' },
			{ updatedAt: 'desc' },
		],
	})

	const formattedNotes = notes.map((note) => ({
		...note,
		createdByName:
			note.createdBy?.name || note.createdBy?.username || 'Unknown',
		statusId: note.statusId ?? null,
		statusName: note.status?.name ?? null,
		position: note.position ?? null,
		uploads: note.uploads.map(upload => ({
			...upload,
			thumbnailKey: upload.thumbnailKey ?? null,
			status: upload.status ?? 'pending',
		})),
	}))

	const statuses = await prisma.organizationNoteStatus.findMany({
		where: { organizationId: organization.id },
		orderBy: { position: 'asc' },
		select: { id: true, name: true, position: true }
	})

	// Get the current view mode from cookie
	const viewMode = await getNotesViewMode(request)

	return {
		organization,
		notes: formattedNotes,
		statuses,
		viewMode,
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const viewMode = formData.get('viewMode') as 'cards' | 'kanban'

	if (viewMode !== 'cards' && viewMode !== 'kanban') {
		throw new Response('Invalid view mode', { status: 400 })
	}

	return new Response(null, {
		headers: {
			'Set-Cookie': await setNotesViewMode(viewMode),
		},
	})
}

import { Tabs, TabsList, TabsTrigger } from '#app/components/ui/tabs.tsx'
import { Tooltip, TooltipTrigger, TooltipContent } from '#app/components/ui/tooltip.tsx'
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
			statusId: string | null
			statusName: string | null
			position: number | null
			uploads: Array<{
				id: string
				type: string
				altText: string | null
				objectKey: string
				thumbnailKey: string | null
				status: string
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
		statuses: Array<{
			id: string
			name: string
			position: number | null
		}>
		viewMode: 'cards' | 'kanban'
	}
}) {
	const location = useLocation()
	const [hasOutlet, setHasOutlet] = useState(false)
	const navigate = useNavigate()
	const fetcher = useFetcher()

	const viewMode = loaderData.viewMode

	// Simple check: if we're not on the base notes route, show outlet
	useEffect(() => {
		const baseNotesPath = `/app/${loaderData.organization.slug}/notes`
		setHasOutlet(location.pathname !== baseNotesPath)
	}, [location.pathname, loaderData.organization.slug])

	return (
		<div className="m-8 flex h-full flex-col">
			<div className="flex items-center justify-between pb-8">
				<PageTitle
					title={`Notes`}
					description="You can create notes for your organization here."
				/>
				<div className="flex items-center gap-4">
					<Tabs
						value={viewMode}
						onValueChange={val => {
							if (val === 'cards' || val === 'kanban') {
								fetcher.submit(
									{ viewMode: val },
									{ method: 'POST' }
								)
							}
						}}
					>
						<TabsList>
							<TabsTrigger value="cards" aria-label="Cards view">
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<Icon name="blocks" />
										</span>
									</TooltipTrigger>
									<TooltipContent>Cards</TooltipContent>
								</Tooltip>
							</TabsTrigger>
							<TabsTrigger value="kanban" aria-label="Kanban board">
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<Icon name="menu" />
										</span>
									</TooltipTrigger>
									<TooltipContent>Kanban</TooltipContent>
								</Tooltip>
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button variant="default" asChild>
						<Link to="new">
							<Icon name="plus">New Note</Icon>
						</Link>
					</Button>
				</div>
			</div>

			<div className="flex-grow overflow-auto pb-4">
				{loaderData.notes.length > 0 ? (
					viewMode === 'kanban' ? (
						<NotesKanbanBoard
							notes={loaderData.notes}
							orgSlug={loaderData.organization.slug}
							statuses={loaderData.statuses}
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
