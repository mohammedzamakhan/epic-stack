import { useDirection } from '@base-ui/react/direction-provider'
import { invariantResponse } from '@epic-web/invariant'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { PageTitle } from '@repo/ui/page-title'
import { Sheet, SheetContent } from '@repo/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip'
import { useEffect, useState } from 'react'
import {
	Outlet,
	Link,
	useLocation,
	useNavigate,
	useFetcher,
	useSearchParams,
	useLoaderData,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { FolderIcon, type FolderColor } from '#app/components/folder-icon.tsx'
import { RecordingsCards } from './recordings-cards.tsx'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug
	const projectId = params.projectId

	invariantResponse(orgSlug, 'Organization slug is required')
	invariantResponse(projectId, 'Project ID is required')

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

	// Get the project
	const project = await prisma.project.findFirst({
		select: {
			id: true,
			name: true,
			description: true,
			color: true,
			createdAt: true,
			updatedAt: true,
			createdById: true,
			createdBy: {
				select: {
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
			_count: {
				select: {
					recordings: true,
				},
			},
		},
		where: {
			id: projectId,
			organizationId: organization.id,
		},
	})

	invariantResponse(project, 'Project not found', { status: 404 })

	// Get search query from URL
	const url = new URL(request.url)
	const searchQuery = url.searchParams.get('search')?.trim() || ''

	// Build search conditions
	const searchConditions = searchQuery
		? {
				OR: [
					{ title: { contains: searchQuery } },
					{ description: { contains: searchQuery } },
				],
			}
		: {}

	// Get project recordings with access control and search
	const recordings = await prisma.recording.findMany({
		select: {
			id: true,
			title: true,
			description: true,
			status: true,
			priority: true,
			tags: true,
			createdAt: true,
			updatedAt: true,
			createdById: true,
			videoObjectKey: true,
			videoThumbnailKey: true,
			videoDuration: true,
			createdBy: {
				select: {
					name: true,
					username: true,
					image: { select: { objectKey: true } },
				},
			},
		},
		where: {
			projectId: project.id,
			...searchConditions,
		},
		orderBy: [{ updatedAt: 'desc' }],
	})

	return {
		organization,
		project: {
			...project,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		},
		recordings: recordings.map((recording) => ({
			...recording,
			createdAt: recording.createdAt.toISOString(),
			updatedAt: recording.updatedAt.toISOString(),
		})),
		searchQuery,
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug
	const projectId = params.projectId
	invariantResponse(orgSlug, 'Organization slug is required')
	invariantResponse(projectId, 'Project ID is required')

	const organization = await prisma.organization.findFirst({
		select: { id: true },
		where: { slug: orgSlug },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	const userId = await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'search') {
		const searchQuery = formData.get('search')?.toString() || ''
		const url = new URL(request.url)
		url.searchParams.set('search', searchQuery)
		throw new Response(null, {
			status: 302,
			headers: { Location: url.toString() },
		})
	}

	throw new Response('Invalid intent', { status: 400 })
}

export default function ProjectDetailPage() {
	const { organization, project, recordings, searchQuery } =
		useLoaderData<typeof loader>()
	const location = useLocation()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { _ } = useLingui()
	const direction = useDirection()
	const fetcher = useFetcher()

	const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

	// Update local search when URL changes
	useEffect(() => {
		setLocalSearchQuery(searchQuery)
	}, [searchQuery])

	const handleSearch = (query: string) => {
		const formData = new FormData()
		formData.append('intent', 'search')
		formData.append('search', query)
		fetcher.submit(formData, { method: 'post' })
	}

	const isSheetOpen = location.pathname.includes('/edit')

	return (
		<div className="flex h-full flex-col py-8 md:p-8">
			<div className="flex items-center justify-between pb-4">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-3">
						<div>
							<PageTitle title={project.name} />
							{project.description && (
								<p className="text-muted-foreground text-sm">
									{project.description}
								</p>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Search */}
					<div className="relative">
						<Icon
							name="search"
							className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
						/>
						<Input
							type="search"
							placeholder={_(t`Search recordings...`)}
							value={localSearchQuery}
							onChange={(e) => {
								setLocalSearchQuery(e.target.value)
								if (e.target.value === '') {
									handleSearch('')
								}
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleSearch(localSearchQuery)
								}
							}}
							className="w-64 pl-10"
						/>
					</div>

					<Button
						variant="outline"
						onClick={() =>
							navigate(`/${organization.slug}/project/${project.id}/edit`)
						}
					>
						<Icon name="pencil" className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only sm:ml-2">
							<Trans>Edit Project</Trans>
						</span>
					</Button>

					<Button
						onClick={() => window.open(`/recorder/${project.id}`, '_blank')}
					>
						<Icon name="record" className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only sm:ml-2">
							<Trans>Record</Trans>
						</span>
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-hidden">
				{recordings.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<EmptyState
							icons={['camera']}
							title={
								searchQuery
									? _(t`No recordings found`)
									: _(t`No recordings yet`)
							}
							description={
								searchQuery
									? _(t`Try adjusting your search terms`)
									: _(t`Start recording your first bug report for this project`)
							}
							action={
								!searchQuery
									? {
											label: 'Start Recording',
											href: `/recorder/${project.id}`,
										}
									: undefined
							}
						/>
					</div>
				) : (
					<div className="h-full overflow-auto">
						<RecordingsCards
							recordings={recordings}
							organizationId={organization.id}
							_projectId={project.id}
						/>
					</div>
				)}
			</div>

			{/* <Sheet open={isSheetOpen} onOpenChange={() => navigate(`/${organization.slug}/project/${project.id}`)}>
				<SheetContent
					side={direction === 'rtl' ? 'left' : 'right'}
					className="w-full sm:max-w-2xl"
				>
					<Outlet />
				</SheetContent>
			</Sheet> */}
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>
						<Trans>Project with ID "{params.projectId}" not found</Trans>
					</p>
				),
			}}
		/>
	)
}
