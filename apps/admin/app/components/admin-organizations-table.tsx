import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'

export interface AdminOrganization {
	id: string
	name: string
	slug: string
	description: string | null
	active: boolean
	createdAt: Date
	updatedAt: Date
	planName: string | null
	subscriptionStatus: string | null
	size: string | null
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	memberCount: number
	totalMembers: number
	noteCount: number
	activeIntegrations: number
	totalIntegrations: number
	image?: {
		id: string
		altText: string | null
	} | null
}

export interface Pagination {
	page: number
	pageSize: number
	totalCount: number
	totalPages: number
}

export interface Filters {
	search: string
	subscriptionStatus: string
	plan: string
}

interface AdminOrganizationsTableProps {
	organizations: AdminOrganization[]
	subscriptionStatuses: string[]
	planNames: string[]
	pagination: Pagination
	filters: Filters
}

const SubscriptionStatusBadge = ({ status }: { status: string | null }) => {
	if (!status) {
		return (
			<Badge variant="secondary">
				<Trans>No Subscription</Trans>
			</Badge>
		)
	}

	switch (status.toLowerCase()) {
		case 'active':
			return (
				<Badge variant="default">
					<Trans>Active</Trans>
				</Badge>
			)
		case 'canceled':
		case 'cancelled':
			return (
				<Badge variant="destructive">
					<Trans>Canceled</Trans>
				</Badge>
			)
		case 'past_due':
			return (
				<Badge variant="destructive">
					<Trans>Past Due</Trans>
				</Badge>
			)
		case 'unpaid':
			return (
				<Badge variant="destructive">
					<Trans>Unpaid</Trans>
				</Badge>
			)
		case 'trialing':
			return (
				<Badge variant="secondary">
					<Trans>Trial</Trans>
				</Badge>
			)
		case 'incomplete':
			return (
				<Badge variant="outline">
					<Trans>Incomplete</Trans>
				</Badge>
			)
		default:
			return <Badge variant="outline">{status}</Badge>
	}
}

const getColumns = (
	_: ReturnType<typeof useLingui>['_'],
): ColumnDef<AdminOrganization>[] => [
	{
		accessorKey: 'organization',
		header: _(msg`Organization`),
		cell: ({ row }) => {
			const org = row.original
			return (
				<div className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={
								org.image?.id
									? `/resources/organization-images/${org.image.id}`
									: undefined
							}
							alt={org.image?.altText ?? org.name}
						/>
						<AvatarFallback>
							<Icon name="blocks" className="h-4 w-4" />
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="font-medium">{org.name}</span>
						<span className="text-muted-foreground text-sm">{org.slug}</span>
					</div>
				</div>
			)
		},
		enableHiding: false,
	},
	{
		accessorKey: 'description',
		header: _(msg`Description`),
		cell: ({ row }) => {
			const description = row.original.description
			if (!description) {
				return (
					<span className="text-muted-foreground">
						<Trans>No description</Trans>
					</span>
				)
			}
			return (
				<span className="max-w-xs truncate text-sm" title={description}>
					{description}
				</span>
			)
		},
	},
	{
		accessorKey: 'members',
		header: _(msg`Members`),
		cell: ({ row }) => {
			const org = row.original
			return (
				<div className="flex items-center gap-2">
					<Icon name="user-plus" className="text-muted-foreground h-4 w-4" />
					<span className="text-sm">
						{org.memberCount}
						{org.totalMembers !== org.memberCount && (
							<span className="text-muted-foreground">/{org.totalMembers}</span>
						)}
					</span>
				</div>
			)
		},
	},
	{
		accessorKey: 'notes',
		header: _(msg`Notes`),
		cell: ({ row }) => {
			const noteCount = row.original.noteCount
			return (
				<div className="flex items-center gap-2">
					<Icon name="file-text" className="text-muted-foreground h-4 w-4" />
					<span className="text-sm">{noteCount}</span>
				</div>
			)
		},
	},
	{
		accessorKey: 'integrations',
		header: _(msg`Integrations`),
		cell: ({ row }) => {
			const org = row.original
			return (
				<div className="flex items-center gap-2">
					<Icon name="link-2" className="text-muted-foreground h-4 w-4" />
					<span className="text-sm">
						{org.activeIntegrations}
						{org.totalIntegrations !== org.activeIntegrations && (
							<span className="text-muted-foreground">
								/{org.totalIntegrations}
							</span>
						)}
					</span>
				</div>
			)
		},
	},
	{
		accessorKey: 'subscription',
		header: _(msg`Subscription`),
		cell: ({ row }) => {
			const org = row.original
			return (
				<div className="flex flex-col gap-1">
					<SubscriptionStatusBadge status={org.subscriptionStatus} />
					{org.planName && (
						<span className="text-muted-foreground text-xs">
							{org.planName}
						</span>
					)}
				</div>
			)
		},
	},
	{
		accessorKey: 'size',
		header: _(msg`Size`),
		cell: ({ row }) => {
			const size = row.original.size
			if (!size) {
				return <span className="text-muted-foreground">-</span>
			}
			return <Badge variant="outline">{size}</Badge>
		},
	},
	{
		accessorKey: 'status',
		header: _(msg`Status`),
		cell: ({ row }) => {
			const isActive = row.original.active
			return (
				<Badge variant={isActive ? 'default' : 'secondary'}>
					{isActive ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
				</Badge>
			)
		},
	},
	{
		accessorKey: 'createdAt',
		header: _(msg`Created`),
		cell: ({ row }) => (
			<span className="text-sm">
				{new Date(row.original.createdAt).toLocaleDateString()}
			</span>
		),
	},
]

export function AdminOrganizationsTable({
	organizations,
	subscriptionStatuses,
	planNames,
	pagination,
	filters,
}: AdminOrganizationsTableProps) {
	const { _ } = useLingui()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [searchQuery, setSearchQuery] = useState(filters.search)
	const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState(
		filters.subscriptionStatus,
	)
	const [planFilter, setPlanFilter] = useState(filters.plan)
	const columns = getColumns(_)

	const table = useReactTable({
		data: organizations,
		columns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: pagination.totalPages,
	})

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		const newSearchParams = new URLSearchParams(searchParams)
		if (value) {
			newSearchParams.set('search', value)
		} else {
			newSearchParams.delete('search')
		}
		newSearchParams.set('page', '1') // Reset to first page
		setSearchParams(newSearchParams)
	}

	const handleSubscriptionStatusFilter = (value: string) => {
		setSubscriptionStatusFilter(value)
		const newSearchParams = new URLSearchParams(searchParams)
		if (value && value !== 'all') {
			newSearchParams.set('subscriptionStatus', value)
		} else {
			newSearchParams.delete('subscriptionStatus')
		}
		newSearchParams.set('page', '1') // Reset to first page
		setSearchParams(newSearchParams)
	}

	const handlePlanFilter = (value: string) => {
		setPlanFilter(value)
		const newSearchParams = new URLSearchParams(searchParams)
		if (value && value !== 'all') {
			newSearchParams.set('plan', value)
		} else {
			newSearchParams.delete('plan')
		}
		newSearchParams.set('page', '1') // Reset to first page
		setSearchParams(newSearchParams)
	}

	const handlePageChange = (page: number) => {
		const newSearchParams = new URLSearchParams(searchParams)
		newSearchParams.set('page', page.toString())
		setSearchParams(newSearchParams)
	}

	const handlePageSizeChange = (pageSize: string) => {
		const newSearchParams = new URLSearchParams(searchParams)
		newSearchParams.set('pageSize', pageSize)
		newSearchParams.set('page', '1') // Reset to first page
		setSearchParams(newSearchParams)
	}

	const clearFilters = () => {
		setSearchQuery('')
		setSubscriptionStatusFilter('')
		setPlanFilter('')
		setSearchParams({})
	}

	const hasActiveFilters =
		filters.search || filters.subscriptionStatus || filters.plan

	return (
		<div className="space-y-4">
			{/* Search and Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 items-center gap-2">
					<div className="relative max-w-sm flex-1">
						<Icon
							name="search"
							className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
						/>
						<Input
							placeholder={_(msg`Search organizations...`)}
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={subscriptionStatusFilter || 'all'}
						onValueChange={(value) =>
							handleSubscriptionStatusFilter(value as string)
						}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								<Trans>All statuses</Trans>
							</SelectItem>
							{subscriptionStatuses.map((status) => (
								<SelectItem key={status} value={status}>
									{status}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={planFilter || 'all'}
						onValueChange={(value) => handlePlanFilter(value as string)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								<Trans>All plans</Trans>
							</SelectItem>
							{planNames.map((plan) => (
								<SelectItem key={plan} value={plan}>
									{plan}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="h-8 px-2 lg:px-3"
						>
							<Trans>Reset</Trans>
							<Icon name="x" className="ml-2 h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="outline" size="sm">
								<Trans>Columns</Trans>
								<Icon name="chevron-down" className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{table
								.getAllColumns()
								.filter(
									(column) =>
										typeof column.accessorFn !== 'undefined' &&
										column.getCanHide(),
								)
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									)
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Results Summary */}
			<div className="text-muted-foreground flex items-center justify-between text-sm">
				<div>
					<Trans>
						Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
						{Math.min(
							pagination.page * pagination.pageSize,
							pagination.totalCount,
						)}{' '}
						of {pagination.totalCount} organizations
					</Trans>
				</div>
			</div>

			{/* Table */}
			<div>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className="hover:bg-muted/50 cursor-pointer"
									onClick={() => navigate(`/organizations/${row.original.id}`)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											void navigate(`/organizations/${row.original.id}`)
										}
									}}
									role="button"
									tabIndex={0}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									<Trans>No organizations found.</Trans>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Label htmlFor="rows-per-page" className="text-sm font-medium">
						<Trans>Rows per page</Trans>
					</Label>
					<Select
						value={pagination.pageSize.toString()}
						onValueChange={(value) => handlePageSizeChange(value as string)}
					>
						<SelectTrigger className="w-20" id="rows-per-page">
							<SelectValue />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={pageSize.toString()}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					<div className="text-sm font-medium">
						<Trans>
							Page {pagination.page} of {pagination.totalPages}
						</Trans>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => handlePageChange(1)}
							disabled={pagination.page === 1}
						>
							<span className="sr-only">
								<Trans>Go to first page</Trans>
							</span>
							<Icon name="chevron-left" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pagination.page - 1)}
							disabled={pagination.page === 1}
						>
							<span className="sr-only">
								<Trans>Go to previous page</Trans>
							</span>
							<Icon name="chevron-left" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pagination.page + 1)}
							disabled={pagination.page === pagination.totalPages}
						>
							<span className="sr-only">
								<Trans>Go to next page</Trans>
							</span>
							<Icon name="chevron-right" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => handlePageChange(pagination.totalPages)}
							disabled={pagination.page === pagination.totalPages}
						>
							<span className="sr-only">
								<Trans>Go to last page</Trans>
							</span>
							<Icon name="chevron-right" className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
