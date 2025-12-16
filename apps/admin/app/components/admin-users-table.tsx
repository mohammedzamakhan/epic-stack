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

import { getUserImgSrc } from '#app/utils/misc.tsx'

export interface AdminUser {
	id: string
	name: string | null
	email: string
	username: string
	createdAt: string
	updatedAt: string
	organizationCount: number
	lastLoginAt: string | null
	isBanned: boolean
	banReason: string | null
	banExpiresAt: string | null
	bannedAt: string | null
	image?: {
		id: string
		altText: string | null
	} | null
	organizations: Array<{
		organization: {
			id: string
			name: string
		}
	}>
}

export interface Organization {
	id: string
	name: string
}

export interface Pagination {
	page: number
	pageSize: number
	totalCount: number
	totalPages: number
}

export interface Filters {
	search: string
	organization: string
}

interface AdminUsersTableProps {
	users: AdminUser[]
	organizations: Organization[]
	pagination: Pagination
	filters: Filters
}

const columns: ColumnDef<AdminUser>[] = [
	{
		accessorKey: 'user',
		header: 'User',
		cell: ({ row }) => {
			const user = row.original
			return (
				<div className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={getUserImgSrc(user.image?.id)}
							alt={user.image?.altText ?? user.name ?? user.username}
						/>
						<AvatarFallback>
							{(user.name ?? user.username).slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="font-medium">{user.name || user.username}</span>
						<span className="text-muted-foreground text-sm">{user.email}</span>
					</div>
				</div>
			)
		},
		enableHiding: false,
	},
	{
		accessorKey: 'username',
		header: 'Username',
		cell: ({ row }) => (
			<span className="font-mono text-sm">{row.original.username}</span>
		),
	},
	{
		accessorKey: 'organizations',
		header: 'Organizations',
		cell: ({ row }) => {
			const orgs = row.original.organizations
			if (!orgs || orgs.length === 0) {
				return <span className="text-muted-foreground">None</span>
			}

			// Get the first valid organization
			const firstOrg = orgs.find((org) => org?.organization?.name)
			if (!firstOrg) {
				return <span className="text-muted-foreground">None</span>
			}

			if (orgs.length === 1) {
				return <Badge variant="secondary">{firstOrg.organization.name}</Badge>
			}

			return (
				<div className="flex items-center gap-1">
					<Badge variant="secondary">{firstOrg.organization.name}</Badge>
					{orgs.length > 1 && (
						<Badge variant="outline">+{orgs.length - 1}</Badge>
					)}
				</div>
			)
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const user = row.original
			if (user.isBanned) {
				const isBanExpired =
					user.banExpiresAt && new Date(user.banExpiresAt) <= new Date()
				return (
					<Badge variant="destructive" className="gap-1">
						<Icon name="ban" className="h-3 w-3" />
						{isBanExpired ? 'Ban Expired' : 'Banned'}
					</Badge>
				)
			}
			return <Badge variant="default">Active</Badge>
		},
	},
	{
		accessorKey: 'lastLoginAt',
		header: 'Last Login',
		cell: ({ row }) => {
			const lastLogin = row.original.lastLoginAt
			if (!lastLogin) {
				return <span className="text-muted-foreground">Never</span>
			}
			return (
				<span className="text-sm">
					{new Date(lastLogin).toLocaleDateString()}
				</span>
			)
		},
	},
	{
		accessorKey: 'createdAt',
		header: 'Created',
		cell: ({ row }) => (
			<span className="text-sm">
				{new Date(row.original.createdAt).toLocaleDateString()}
			</span>
		),
	},
]

export function AdminUsersTable({
	users,
	organizations,
	pagination,
	filters,
}: AdminUsersTableProps) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
	const [searchQuery, setSearchQuery] = useState(filters.search)
	const [organizationFilter, setOrganizationFilter] = useState(
		filters.organization,
	)

	const table = useReactTable({
		data: users,
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

	const handleOrganizationFilter = (value: string) => {
		setOrganizationFilter(value)
		const newSearchParams = new URLSearchParams(searchParams)
		if (value && value !== 'all') {
			newSearchParams.set('organization', value)
		} else {
			newSearchParams.delete('organization')
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
		setOrganizationFilter('')
		setSearchParams({})
	}

	const hasActiveFilters = filters.search || filters.organization

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
							placeholder="Search users..."
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={organizationFilter || 'all'}
						onValueChange={(value) => handleOrganizationFilter(value as string)}
					>
						<SelectTrigger className="w-48">
							Filter by organization
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All organizations</SelectItem>
							{organizations.map((org) => (
								<SelectItem key={org.id} value={org.name}>
									{org.name}
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
							Reset
							<Icon name="x" className="ml-2 h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="outline" size="sm">
								Columns
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
					Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
					{Math.min(
						pagination.page * pagination.pageSize,
						pagination.totalCount,
					)}{' '}
					of {pagination.totalCount} users
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
									onClick={() => navigate(`/users/${row.original.id}`)}
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
									No users found.
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
						Rows per page
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
						Page {pagination.page} of {pagination.totalPages}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => handlePageChange(1)}
							disabled={pagination.page === 1}
						>
							<span className="sr-only">Go to first page</span>
							<Icon name="chevrons-left" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pagination.page - 1)}
							disabled={pagination.page === 1}
						>
							<span className="sr-only">Go to previous page</span>
							<Icon name="chevron-left" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="h-8 w-8 p-0"
							onClick={() => handlePageChange(pagination.page + 1)}
							disabled={pagination.page === pagination.totalPages}
						>
							<span className="sr-only">Go to next page</span>
							<Icon name="chevron-right" className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							className="hidden h-8 w-8 p-0 lg:flex"
							onClick={() => handlePageChange(pagination.totalPages)}
							disabled={pagination.page === pagination.totalPages}
						>
							<span className="sr-only">Go to last page</span>
							<Icon name="chevrons-right" className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
