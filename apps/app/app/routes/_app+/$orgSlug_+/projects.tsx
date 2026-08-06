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
import { useEffect, useState } from 'react'
import {
	Outlet,
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
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'
import { logProjectActivity } from '#app/utils/project-activity-log.server.ts'
import { ProjectsCards } from './projects-cards.tsx'

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
	const searchConditions = searchQuery
		? {
				OR: [
					{ name: { contains: searchQuery } },
					{ description: { contains: searchQuery } },
				],
			}
		: {}

	// Get organization projects with access control and search
	const projects = await prisma.project.findMany({
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
			organizationId: organization.id,
			...searchConditions,
		},
		orderBy: [{ updatedAt: 'desc' }],
	})

	return {
		organization,
		projects: projects.map((project) => ({
			...project,
			createdAt: project.createdAt.toISOString(),
			updatedAt: project.updatedAt.toISOString(),
		})),
		searchQuery,
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug
	invariantResponse(orgSlug, 'Organization slug is required')

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

	if (intent === 'delete-project') {
		const projectId = formData.get('projectId')?.toString()
		invariantResponse(projectId, 'Project ID is required')

		const project = await prisma.project.findFirst({
			where: { id: projectId, organizationId: organization.id },
		})

		invariantResponse(project, 'Project not found', { status: 404 })

		await prisma.project.delete({
			where: { id: projectId },
		})

		await logProjectActivity({
			projectId,
			userId,
			action: 'deleted',
			metadata: { name: project.name },
		})

		return { status: 'success' }
	}

	throw new Response('Invalid intent', { status: 400 })
}

export default function ProjectsPage() {
	const { organization, projects, searchQuery } = useLoaderData<typeof loader>()
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
		void fetcher.submit(formData, { method: 'post' })
	}

	const isSheetOpen =
		location.pathname.includes('/new') || location.pathname.includes('/edit')

	return (
		<div className="flex h-full flex-col py-8 md:p-8">
			<div className="flex items-center justify-between pb-4">
				<div className="flex items-center gap-4">
					<PageTitle title="Projects" />
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
							placeholder={_(t`Search projects...`)}
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

					<Button onClick={() => navigate('new')}>
						<Icon name="plus" className="h-4 w-4" />
						<span className="sr-only sm:not-sr-only sm:ml-2">
							<Trans>New Project</Trans>
						</span>
					</Button>
				</div>
			</div>

			<div className="flex-1 overflow-hidden">
				{projects.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<EmptyState
							icons={['file-text']}
							title={
								searchQuery ? _(t`No projects found`) : _(t`No projects yet`)
							}
							description={
								searchQuery
									? _(t`Try adjusting your search terms`)
									: _(
											t`Create your first project to organize your bug recordings`,
										)
							}
							action={
								!searchQuery
									? {
											label: 'Create Project',
											href: 'new',
										}
									: undefined
							}
						/>
					</div>
				) : (
					<div className="h-full overflow-auto">
						<ProjectsCards
							projects={projects}
							organizationId={organization.id}
						/>
					</div>
				)}
			</div>

			{/* Sheet for new/edit project */}
			<Sheet open={isSheetOpen} onOpenChange={() => navigate('.')}>
				<SheetContent
					side={direction === 'rtl' ? 'left' : 'right'}
					className="w-full sm:max-w-2xl"
				>
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
				404: () => (
					<p>
						<Trans>Organization not found</Trans>
					</p>
				),
			}}
		/>
	)
}
