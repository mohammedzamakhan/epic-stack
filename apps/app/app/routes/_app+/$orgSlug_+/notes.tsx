import { invariantResponse } from '@epic-web/invariant'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Portal } from '@radix-ui/react-portal'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { PageTitle } from '@repo/ui/page-title'
import { Sheet, SheetContent } from '@repo/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip'
import { useEffect, useState } from 'react'
import {
	Outlet,
	Link,
	useLocation,
	useNavigate,
	useFetcher,
	useSearchParams,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'


import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	getNotesViewMode,
	setNotesViewMode,
} from '#app/utils/notes-view-cookie.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { NotesCards } from './notes-cards.tsx'
import { NotesKanbanBoard } from './notes-kanban-board.tsx'

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

	// Get search query from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get('search')?.trim() || ''

	// Build search conditions
	// For SQLite, we'll use a simpler approach and rely on the database's default behavior
	const searchConditions = searchQuery
		? {
				OR: [
					{ title: { contains: searchQuery } },
					{ content: { contains: searchQuery } },
				],
			}
		: {}

	// Get organization notes with access control and search
	const notes = await prisma.organizationNote.findMany({
		select: {
			id: true,
			title: true,
			content: true,
			priority: true,
			tags: true,
			createdAt: true,
			updatedAt: true,
			isPublic: true,
			createdById: true,
			statusId: true,
			status: { select: { id: true, name: true, color: true } },
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
					image: {
						select: {
							objectKey: true,
						},
					},
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
			AND: [
				{
					OR: [
						{ isPublic: true },
						{ createdById: userId },
						{ noteAccess: { some: { userId } } },
					],
				},
				searchConditions,
			],
		},
		orderBy: [{ statusId: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
	})

	const formattedNotes = notes.map((note) => ({
		...note,
		createdByName:
			note.createdBy?.name || note.createdBy?.username || 'Unknown',
		statusId: note.statusId ?? null,
		statusName: note.status?.name ?? null,
		position: note.position ?? null,
		uploads: note.uploads.map((upload) => ({
			...upload,
			thumbnailKey: upload.thumbnailKey ?? null,
			status: upload.status ?? 'pending',
		})),
	}))

	const statuses = await prisma.organizationNoteStatus.findMany({
		where: { organizationId: organization.id },
		orderBy: { position: 'asc' },
		select: { id: true, name: true, color: true, position: true },
	})

	// Get the current view mode from cookie
	const viewMode = await getNotesViewMode(request)

	return {
		organization,
		notes: formattedNotes,
		statuses,
		viewMode,
		searchQuery,
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
		searchQuery: string
	}
}) {
	const { _ } = useLingui()
	const location = useLocation()
	const [hasOutlet, setHasOutlet] = useState(false)
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const [searchParams, setSearchParams] = useSearchParams()
	const [searchValue, setSearchValue] = useState(loaderData.searchQuery)

	const viewMode = loaderData.viewMode

	// Simple check: if we're not on the base notes route, show outlet
	useEffect(() => {
		const baseNotesPath = `/${loaderData.organization.slug}/notes`
		setHasOutlet(location.pathname !== baseNotesPath)
	}, [location.pathname, loaderData.organization.slug])

	// Handle search
	const handleSearch = (value: string) => {
		const newSearchParams = new URLSearchParams(searchParams)
		if (value.trim()) {
			newSearchParams.set('search', value.trim())
		} else {
			newSearchParams.delete('search')
		}
		setSearchParams(newSearchParams)
	}

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		handleSearch(searchValue)
	}

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSearch(searchValue)
		}
	}

	return (
		<div className="flex h-full flex-col py-8 md:p-8">
			<div className="flex items-center justify-between pb-4">
				<PageTitle
					title={_(t`Notes`)}
					description={_(t`You can create notes for your organization here.`)}
				/>
				<div className="flex items-center gap-4">
					<Tabs
						value={viewMode}
						onValueChange={(val) => {
							if (val === 'cards' || val === 'kanban') {
								void fetcher.submit({ viewMode: val }, { method: 'POST' })
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
									<Portal>
										<TooltipContent>
											<Trans>Cards</Trans>
										</TooltipContent>
									</Portal>
								</Tooltip>
							</TabsTrigger>
							<TabsTrigger value="kanban" aria-label="Kanban board">
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<Icon name="menu" />
										</span>
									</TooltipTrigger>
									<Portal>
										<TooltipContent>
											<Trans>Kanban</Trans>
										</TooltipContent>
									</Portal>
								</Tooltip>
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button variant="default" asChild>
						<Link to="new">
							<Icon name="plus">
								<Trans>New Note</Trans>
							</Icon>
						</Link>
					</Button>
				</div>
			</div>

			{/* Search Section */}
			<div className="pb-4">
				<form onSubmit={handleSearchSubmit} className="relative max-w-md">
					<Input
						type="search"
						role="searchbox"
						name="search"
						aria-label="Search notes"
						placeholder={_(t`Search notes by title or content...`)}
						value={searchValue}
						onChange={(e) => {
							setSearchValue(e.target.value)
						}}
						onKeyDown={handleSearchKeyDown}
						onBlur={() => handleSearch(searchValue)}
						className="pr-10"
					/>
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						<Icon name="search" className="text-muted-foreground h-4 w-4" />
					</div>
				</form>
			</div>

			<div className="flex-grow pb-4">
				{loaderData.notes.length > 0 ? (
					viewMode === 'kanban' ? (
						<NotesKanbanBoard
							notes={loaderData.notes}
							orgSlug={loaderData.organization.slug}
							statuses={loaderData.statuses}
							organizationId={loaderData.organization.id}
						/>
					) : (
						<NotesCards
							notes={loaderData.notes}
							organizationId={loaderData.organization.id}
						/>
					)
				) : loaderData.searchQuery ? (
					<EmptyState
						title={_(t`No notes found`)}
						description={_(
							t`No notes match your search for "${loaderData.searchQuery}". Try a different search term or create a new note.`,
						)}
						icons={['search', 'file-text']}
						action={{
							label: _(t`Create Note`),
							href: `/${loaderData.organization.slug}/notes/new`,
						}}
					/>
				) : (
					<EmptyState
						title={_(t`You haven't created any notes yet!`)}
						description={_(
							t`Notes help you capture thoughts, meeting minutes, or anything important for your organization. Get started by creating your first note.`,
						)}
						icons={['file-text', 'link-2', 'image']}
						action={{
							label: _(t`Create Note`),
							href: `/${loaderData.organization.slug}/notes/new`,
						}}
					/>
				)}
			</div>

			{/* Sheet for nested routes */}
			<Sheet
				open={hasOutlet}
				onOpenChange={() => {
					if (hasOutlet) {
						// Navigate back to notes list
						void navigate(`/${loaderData.organization.slug}/notes`)
					}
				}}
			>
				<SheetContent className="flex w-[40vw] flex-col gap-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
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
					<p>
						<Trans>No organization with the slug "{params.orgSlug}" exists</Trans>
					</p>
				),
			}}
		/>
	)
}
