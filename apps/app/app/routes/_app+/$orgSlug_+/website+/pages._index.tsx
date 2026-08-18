import { parseWithZod } from '@conform-to/zod'
import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { requireUserId } from '@repo/auth'
import { pickLocalized } from '@repo/common/site-locales'
import { prisma } from '@repo/database'
import { cn } from '@repo/ui'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@repo/ui/alert-dialog'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group'
import { Spinner } from '@repo/ui/spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	Link,
	useFetcher,
	useLoaderData,
	useNavigate,
	useSearchParams,
} from 'react-router'
import { z } from 'zod'
import { EmptyState } from '#app/components/empty-state.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'
import {
	PAGE_TEMPLATES,
	getDefaultConfig,
	type BlockType,
	type PageTemplate,
} from '#app/utils/website/block-types.ts'
import { HOME_PAGE_SLUG } from '#app/utils/website/home-page.ts'
import { ensureSiteChrome } from '#app/utils/website/locked-chrome.server.ts'

// --- Action Intents ---
const createPageIntent = 'create-page'
const publishPageIntent = 'publish-page'
const unpublishPageIntent = 'unpublish-page'
const deletePageIntent = 'delete-page'

// --- Schemas ---
const CreatePageSchema = z.object({
	intent: z.literal(createPageIntent),
	template: z.enum(['blank', 'article', 'showcase']),
	title: z.string().min(1, 'Title is required').max(200),
	slug: z
		.string()
		.min(1, 'URL slug is required')
		.max(200)
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			'URL must contain only lowercase letters, numbers, and hyphens',
		),
})

const PageActionSchema = z.object({
	intent: z.enum([publishPageIntent, unpublishPageIntent, deletePageIntent]),
	pageId: z.string().min(1),
})

// --- Loader ---
export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		siteDefaultLocale: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.READ_SETTINGS_ANY,
	)

	const defaultLocale = organization.siteDefaultLocale ?? 'en'
	const url = new URL(request.url)
	const search = url.searchParams.get('search')?.trim() || ''

	const searchConditions = search ? { title: { contains: search } } : {}

	const pages = await prisma.websitePage.findMany({
		where: {
			organizationId: organization.id,
			...searchConditions,
		},
		select: {
			id: true,
			title: true,
			slug: true,
			status: true,
			template: true,
			isHomePage: true,
			createdAt: true,
			updatedAt: true,
			createdBy: {
				select: { name: true, username: true },
			},
		},
		orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
	})

	return {
		organization,
		defaultLocale,
		pages: pages.map((page) => ({
			...page,
			title:
				pickLocalized(page.title, defaultLocale, defaultLocale) || page.title,
			createdAt: page.createdAt.toISOString(),
			updatedAt: page.updatedAt.toISOString(),
			createdByName: page.createdBy.name || page.createdBy.username,
		})),
		search,
	}
}

// --- Action ---
export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.UPDATE_SETTINGS_ANY,
	)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === createPageIntent) {
		const submission = parseWithZod(formData, { schema: CreatePageSchema })

		if (submission.status !== 'success') {
			return Response.json({
				status: 'error' as const,
				result: submission.reply(),
			})
		}

		const { template, title, slug } = submission.value

		// Check for duplicate slug
		const existing = await prisma.websitePage.findUnique({
			where: {
				organizationId_slug: {
					organizationId: organization.id,
					slug,
				},
			},
			select: { id: true, isHomePage: true, slug: true },
		})

		if (existing) {
			return Response.json({
				status: 'error' as const,
				result: submission.reply({
					fieldErrors: {
						slug: ['Page URL already exists in this organization'],
					},
				}),
			})
		}

		// Get the last position
		const lastPage = await prisma.websitePage.findFirst({
			where: { organizationId: organization.id },
			orderBy: { position: 'desc' },
			select: { position: true },
		})
		const nextPosition = (lastPage?.position ?? 0) + 1

		await ensureSiteChrome(organization.id)

		// Create page with template sections
		const templateDef = PAGE_TEMPLATES[template as PageTemplate]
		const page = await prisma.websitePage.create({
			data: {
				organizationId: organization.id,
				title,
				slug,
				template,
				position: nextPosition,
				createdById: userId,
				sections: {
					create: (templateDef?.sections ?? []).map((section) => ({
						type: section.type,
						position: section.position,
						config: JSON.stringify(getDefaultConfig(section.type as BlockType)),
					})),
				},
			},
			select: { id: true },
		})

		return Response.json({
			status: 'success' as const,
			pageId: page.id,
		})
	}

	if (
		intent === publishPageIntent ||
		intent === unpublishPageIntent ||
		intent === deletePageIntent
	) {
		const submission = parseWithZod(formData, { schema: PageActionSchema })

		if (submission.status !== 'success') {
			return Response.json({
				status: 'error' as const,
				result: submission.reply(),
			})
		}

		const { pageId } = submission.value

		const page = await prisma.websitePage.findFirst({
			where: { id: pageId, organizationId: organization.id },
			select: { id: true, isHomePage: true, slug: true },
		})

		if (!page) {
			return Response.json(
				{ status: 'error' as const, error: 'Page not found' },
				{ status: 404 },
			)
		}

		if (intent === publishPageIntent) {
			await prisma.websitePage.update({
				where: { id: pageId },
				data: { status: 'published' },
			})
			return Response.json({ status: 'success' as const })
		}

		if (intent === unpublishPageIntent) {
			if (page.isHomePage || page.slug === HOME_PAGE_SLUG) {
				return Response.json({
					status: 'error' as const,
					error: 'Cannot unpublish the home page',
				})
			}
			await prisma.websitePage.update({
				where: { id: pageId },
				data: { status: 'draft' },
			})
			return Response.json({ status: 'success' as const })
		}

		if (intent === deletePageIntent) {
			if (page.isHomePage || page.slug === HOME_PAGE_SLUG) {
				return Response.json({
					status: 'error' as const,
					error: 'Cannot delete the home page',
				})
			}
			await prisma.websitePage.delete({
				where: { id: pageId },
			})
			return Response.json({ status: 'success' as const })
		}
	}

	return Response.json(
		{ status: 'error' as const, error: `Invalid intent: ${intent}` },
		{ status: 400 },
	)
}

// --- Page Row Component ---
function PageRow({
	page,
}: {
	page: {
		id: string
		title: string
		slug: string
		status: string
		isHomePage: boolean
		createdByName: string
		updatedAt: string
	}
}) {
	const { _ } = useLingui()
	const publishFetcher = useFetcher()
	const deleteFetcher = useFetcher()
	const busy = publishFetcher.state !== 'idle' || deleteFetcher.state !== 'idle'
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	const optimisticStatus =
		publishFetcher.formData?.get('intent') === publishPageIntent
			? 'published'
			: publishFetcher.formData?.get('intent') === unpublishPageIntent
				? 'draft'
				: page.status

	const pageTitle = page.title

	return (
		<TableRow className={cn(busy && 'opacity-60')}>
			<TableCell>
				<Link
					to={`${page.id}`}
					className="hover:text-primary text-sm font-medium"
				>
					{page.title}
					{page.isHomePage && (
						<Badge variant="outline" className="ml-2 text-xs">
							<Trans>Home</Trans>
						</Badge>
					)}
				</Link>
			</TableCell>
			<TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
				{page.createdByName}
			</TableCell>
			<TableCell>
				<Badge
					variant={optimisticStatus === 'published' ? 'default' : 'secondary'}
				>
					{optimisticStatus === 'published' ? (
						<Trans>Published</Trans>
					) : (
						<Trans>Draft</Trans>
					)}
				</Badge>
			</TableCell>
			<TableCell className="text-muted-foreground hidden text-sm md:table-cell">
				{formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
			</TableCell>
			<TableCell className="text-right">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={busy}
								aria-label={_(t`Page actions`)}
							>
								<Icon name="ellipsis" className="size-4" />
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							render={
								<Link to={`${page.id}`}>
									<Icon name="pencil" className="mr-2 size-4" />
									<Trans>Edit</Trans>
								</Link>
							}
						/>

						{optimisticStatus === 'draft' ? (
							<DropdownMenuItem
								onClick={() => {
									void publishFetcher.submit(
										{
											intent: publishPageIntent,
											pageId: page.id,
										},
										{ method: 'POST' },
									)
								}}
							>
								<Icon name="check-circle" className="mr-2 size-4" />
								<Trans>Publish</Trans>
							</DropdownMenuItem>
						) : !page.isHomePage ? (
							<DropdownMenuItem
								onClick={() => {
									void publishFetcher.submit(
										{
											intent: unpublishPageIntent,
											pageId: page.id,
										},
										{ method: 'POST' },
									)
								}}
							>
								<Icon name="circle" className="mr-2 size-4" />
								<Trans>Unpublish</Trans>
							</DropdownMenuItem>
						) : null}

						{!page.isHomePage && (
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={() => setDeleteDialogOpen(true)}
							>
								<Icon name="trash-2" className="mr-2 size-4" />
								<Trans>Delete</Trans>
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{!page.isHomePage && (
					<AlertDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									<Trans>Delete page?</Trans>
								</AlertDialogTitle>
								<AlertDialogDescription>
									<Trans>
										This action cannot be undone. Are you sure you want to
										delete "{pageTitle}"?
									</Trans>
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>
									<Trans>Cancel</Trans>
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										void deleteFetcher.submit(
											{
												intent: deletePageIntent,
												pageId: page.id,
											},
											{ method: 'POST' },
										)
										setDeleteDialogOpen(false)
									}}
								>
									<Trans>Delete</Trans>
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
			</TableCell>
		</TableRow>
	)
}

// --- Create Page Dialog ---
function CreatePageDialog() {
	const { _ } = useLingui()
	const fetcher = useFetcher<typeof action>()
	const navigate = useNavigate()
	const [step, setStep] = useState<1 | 2>(1)
	const [template, setTemplate] = useState<PageTemplate>('blank')
	const [title, setTitle] = useState('')
	const [slug, setSlug] = useState('')
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
	const [open, setOpen] = useState(false)

	// Auto-derive slug from title
	useEffect(() => {
		if (!slugManuallyEdited && title) {
			setSlug(
				title
					.toLowerCase()
					.replace(/[^a-z0-9\s-]/g, '')
					.replace(/\s+/g, '-')
					.replace(/-+/g, '-')
					.replace(/^-|-$/g, ''),
			)
		}
	}, [title, slugManuallyEdited])

	// Navigate to the builder on success
	useEffect(() => {
		const data = fetcher.data as any
		if (data && data.status === 'success' && data.pageId) {
			setOpen(false)
			void navigate(`${data.pageId}`)
		}
	}, [fetcher.data, navigate])

	const handleOpenChange = useCallback((isOpen: boolean) => {
		setOpen(isOpen)
		if (!isOpen) {
			setStep(1)
			setTemplate('blank')
			setTitle('')
			setSlug('')
			setSlugManuallyEdited(false)
		}
	}, [])

	const slugError = (fetcher.data as any)?.result?.error?.slug?.[0]

	const templates = Object.entries(PAGE_TEMPLATES).map(([key, val]) => ({
		value: key as PageTemplate,
		label: val.label,
		description: val.description,
	}))

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button size="sm" className="shrink-0">
						<Icon name="plus" className="size-4" />
						<Trans>New Page</Trans>
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				{step === 1 ? (
					<>
						<DialogHeader>
							<DialogTitle>
								<Trans>Choose a template</Trans>
							</DialogTitle>
							<DialogDescription>
								<Trans>Select a starting layout for your new page.</Trans>
							</DialogDescription>
						</DialogHeader>

						<RadioGroup
							value={template}
							onValueChange={(val: string) => setTemplate(val as PageTemplate)}
							className="grid gap-3"
						>
							{templates.map((tmpl) => (
								<label
									key={tmpl.value}
									className={cn(
										'border-border hover:border-primary/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
										template === tmpl.value && 'border-primary bg-primary/5',
									)}
								>
									<RadioGroupItem value={tmpl.value} className="mt-0.5" />
									<div>
										<div className="text-sm font-medium">{tmpl.label}</div>
										<div className="text-muted-foreground text-xs">
											{tmpl.description}
										</div>
									</div>
								</label>
							))}
						</RadioGroup>

						<DialogFooter>
							<Button onClick={() => setStep(2)}>
								<Trans>Next</Trans>
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>
								<Trans>New page</Trans>
							</DialogTitle>
							<DialogDescription>
								<Trans>Set the title and URL for your new page.</Trans>
							</DialogDescription>
						</DialogHeader>

						<fetcher.Form method="POST" className="space-y-4">
							<input type="hidden" name="intent" value={createPageIntent} />
							<input type="hidden" name="template" value={template} />

							<div className="space-y-2">
								<Label htmlFor="page-title">
									<Trans>Page Title</Trans>
								</Label>
								<Input
									id="page-title"
									name="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder={_(t`e.g. About Us`)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="page-slug">
									<Trans>Page URL</Trans>
								</Label>
								<Input
									id="page-slug"
									name="slug"
									value={slug}
									onChange={(e) => {
										setSlug(e.target.value)
										setSlugManuallyEdited(true)
									}}
									placeholder={_(t`e.g. about-us`)}
									required
								/>
								{slugError && (
									<p className="text-destructive text-xs">{slugError}</p>
								)}
								<p className="text-muted-foreground text-xs">
									<Trans>This will be the URL path for this page.</Trans>
								</p>
							</div>

							<DialogFooter>
								<Button
									variant="outline"
									type="button"
									onClick={() => setStep(1)}
								>
									<Trans>Back</Trans>
								</Button>
								<Button
									type="submit"
									disabled={fetcher.state !== 'idle' || !title || !slug}
								>
									{fetcher.state !== 'idle' ? (
										<Spinner />
									) : (
										<Trans>Create</Trans>
									)}
								</Button>
							</DialogFooter>
						</fetcher.Form>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}

// --- Main Page Component ---
export default function WebsitePagesRoute() {
	const { pages, search } = useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	const { _ } = useLingui()

	const handleSearch = useCallback(
		(value: string) => {
			const newParams = new URLSearchParams(searchParams)
			if (value) {
				newParams.set('search', value)
			} else {
				newParams.delete('search')
			}
			setSearchParams(newParams)
		},
		[searchParams, setSearchParams],
	)

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h2 className="text-base font-semibold">
						<Trans>Pages</Trans>
					</h2>
					<p className="text-muted-foreground text-sm">
						<Trans>
							Create and manage pages for your organization's website.
						</Trans>
					</p>
				</div>
				<CreatePageDialog />
			</div>

			{pages.length === 0 && !search ? (
				<EmptyState
					title={_(t`No pages yet`)}
					description={_(
						t`Create your first page to start building your website.`,
					)}
					icons={['file-text', 'blocks', 'sparkles']}
				/>
			) : (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<div className="relative max-w-sm flex-1">
							<Icon
								name="search"
								className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
							/>
							<Input
								type="search"
								placeholder={_(t`Search pages...`)}
								defaultValue={search}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-9"
							/>
						</div>
					</div>

					{pages.length === 0 && search ? (
						<EmptyState
							title={_(t`No pages match that search`)}
							description={_(
								t`Try a different search term or clear the search.`,
							)}
							icons={['search']}
						/>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>
											<Trans>Page</Trans>
										</TableHead>
										<TableHead className="hidden sm:table-cell">
											<Trans>Created By</Trans>
										</TableHead>
										<TableHead>
											<Trans>Status</Trans>
										</TableHead>
										<TableHead className="hidden md:table-cell">
											<Trans>Updated</Trans>
										</TableHead>
										<TableHead className="w-16">
											<span className="sr-only">
												<Trans>Actions</Trans>
											</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pages.map((page) => (
										<PageRow key={page.id} page={page} />
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
