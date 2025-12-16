import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type UniqueIdentifier,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Avatar, AvatarFallback } from '@repo/ui/avatar'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardTitle,
	CardDescription,
	CardHeader,
	CardContent,
	CardAction,
} from '@repo/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@repo/ui/chart'
import { Checkbox } from '@repo/ui/checkbox'
import { cn } from '@repo/ui/cn'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@repo/ui/drawer'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { Separator } from '@repo/ui/separator'
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from '@tanstack/react-table'
import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { toast } from 'sonner'
import { z } from 'zod'

import { useIsMobile } from '#app/hooks/use-mobile.ts'

// Helper function to get initials from a name
function getInitials(name: string): string {
	return name
		.split(' ')
		.map((part) => part.charAt(0))
		.join('')
		.toUpperCase()
}

// Available reviewers list
const AVAILABLE_REVIEWERS = [
	'Eddie Lake',
	'Jamik Tashpulatov',
	'Maya Johnson',
	'Carlos Rodriguez',
	'Sarah Chen',
	'Raj Patel',
	'Leila Ahmadi',
	'Thomas Wilson',
	'Sophia Martinez',
	'Alex Thompson',
	'Nina Patel',
	'David Kim',
	'Maria Garcia',
	'James Wilson',
	'Priya Singh',
	'Sarah Johnson',
	'Michael Chen',
	'Lisa Wong',
	'Daniel Park',
	'Emma Davis',
]

export const schema = z.object({
	id: z.number(),
	header: z.string(),
	type: z.string(),
	status: z.string(),
	target: z.string(),
	limit: z.string(),
	reviewers: z.array(z.string()),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
	const { attributes, listeners } = useSortable({
		id,
	})

	return (
		<Button
			{...attributes}
			{...listeners}
			variant="ghost"
			size="icon"
			className="text-muted-foreground size-7 hover:bg-transparent"
		>
			<Icon name="grip-vertical" className="text-muted-foreground size-3" />
			<span className="sr-only">
				<Trans>Drag to reorder</Trans>
			</span>
		</Button>
	)
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
	{
		id: 'drag',
		header: () => null,
		cell: ({ row }) => <DragHandle id={row.original.id} />,
	},
	{
		id: 'select',
		header: ({ table }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={table.getIsAllPageRowsSelected()}
					indeterminate={table.getIsSomePageRowsSelected()}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			</div>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-center">
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			</div>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: 'header',
		header: () => <Trans>Header</Trans>,
		cell: ({ row }) => {
			return <TableCellViewer item={row.original} />
		},
		enableHiding: false,
	},
	{
		accessorKey: 'type',
		header: () => <Trans>Section Type</Trans>,
		cell: ({ row }) => (
			<div className="w-32">
				<Badge variant="outline" className="text-muted-foreground px-1.5">
					{row.original.type}
				</Badge>
			</div>
		),
	},
	{
		accessorKey: 'status',
		header: () => <Trans>Status</Trans>,
		cell: ({ row }) => (
			<Badge variant="outline" className="text-muted-foreground px-1.5">
				{row.original.status === 'Done' ? (
					<Icon
						name="circle-check"
						className="fill-green-500 dark:fill-green-400"
					/>
				) : (
					<Icon name="loader" />
				)}
				{row.original.status}
			</Badge>
		),
	},
	{
		accessorKey: 'target',
		header: () => (
			<div className="w-full">
				<Trans>Target</Trans>
			</div>
		),
		cell: ({ row }) => (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const { _ } = useLingui()
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
						loading: _(msg`Saving ${row.original.header}`),
						success: _(msg`Done`),
						error: _(msg`Error`),
					})
				}}
			>
				<Label htmlFor={`${row.original.id}-target`} className="sr-only">
					<Trans>Target</Trans>
				</Label>
				<Input
					className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
					defaultValue={row.original.target}
					id={`${row.original.id}-target`}
				/>
			</form>
		),
	},
	{
		accessorKey: 'limit',
		header: () => (
			<div className="w-full">
				<Trans>Limit</Trans>
			</div>
		),
		cell: ({ row }) => (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					const { _ } = useLingui()
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
						loading: _(msg`Saving ${row.original.header}`),
						success: _(msg`Done`),
						error: _(msg`Error`),
					})
				}}
			>
				<Label htmlFor={`${row.original.id}-limit`} className="sr-only">
					<Trans>Limit</Trans>
				</Label>
				<Input
					className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent shadow-none focus-visible:border dark:bg-transparent"
					defaultValue={row.original.limit}
					id={`${row.original.id}-limit`}
				/>
			</form>
		),
	},
	{
		accessorKey: 'reviewers',
		header: () => <Trans>Reviewers</Trans>,
		cell: ({ row }) => {
			const reviewers = row.original.reviewers || []
			const availableReviewers = AVAILABLE_REVIEWERS.filter(
				(reviewer) => !reviewers.includes(reviewer),
			)

			const addReviewer = (newReviewer: string) => {
				// Here you would typically update the data state
				// For now, we'll just show a toast
				toast.success(`Added ${newReviewer} as reviewer`)
			}

			return (
				<div className="flex max-w-44 items-center gap-1">
					{/* Existing reviewer avatars */}
					{reviewers.map((reviewer) => (
						<Avatar
							key={reviewer}
							className="border-background size-7 border-2"
						>
							<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
								{getInitials(reviewer)}
							</AvatarFallback>
						</Avatar>
					))}

					{/* Plus button to add new reviewer */}
					{availableReviewers.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Button
									variant="ghost"
									size="icon"
									className="border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 size-7 rounded-full border-2 border-dashed"
								>
									<Icon name="plus" className="size-3" />
									<span className="sr-only">
										<Trans>Add reviewer</Trans>
									</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								{availableReviewers.map((reviewer) => (
									<DropdownMenuItem
										key={reviewer}
										onSelect={() => addReviewer(reviewer)}
									>
										<div className="flex items-center gap-2">
											<Avatar className="size-6">
												<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
													{getInitials(reviewer)}
												</AvatarFallback>
											</Avatar>
											{reviewer}
										</div>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* Show message if no reviewers and no available reviewers */}
					{reviewers.length === 0 && availableReviewers.length === 0 && (
						<span className="text-muted-foreground text-sm">
							<Trans>All assigned</Trans>
						</span>
					)}
				</div>
			)
		},
	},
	{
		id: 'actions',
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<Icon name="more-vertical" />
						<span className="sr-only">
							<Trans>Open menu</Trans>
						</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem>
						<Trans>Edit</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Trans>Make a copy</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Trans>Favorite</Trans>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">
						<Trans>Delete</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
]

function DraggableRowStyled({ row }: { row: Row<z.infer<typeof schema>> }) {
	const { transform, transition, setNodeRef, isDragging } = useSortable({
		id: row.original.id,
	})

	return (
		<tr
			data-state={row.getIsSelected() && 'selected'}
			data-dragging={isDragging}
			ref={setNodeRef}
			className="group/table-row hover:bg-muted/50 [&+&]:border-border relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 [&+&]:border-t"
			style={{
				transform: CSS.Transform.toString(transform),
				transition: transition,
			}}
		>
			{row.getVisibleCells().map((cell) => (
				<td
					key={cell.id}
					className="overflow-hidden border-0 px-2 py-2 text-left"
				>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</td>
			))}
		</tr>
	)
}

export function DataTable({
	data: initialData,
}: {
	data: z.infer<typeof schema>[]
}) {
	const [data, setData] = React.useState(() => initialData)
	const [rowSelection, setRowSelection] = React.useState({})
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	)
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [pagination, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: 10,
	})
	const sortableId = React.useId()
	const sensors = useSensors(
		useSensor(MouseSensor, {}),
		useSensor(TouchSensor, {}),
		useSensor(KeyboardSensor, {}),
	)

	const dataIds = React.useMemo<UniqueIdentifier[]>(
		() => data?.map(({ id }) => id) || [],
		[data],
	)

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
			pagination,
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
	})

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event
		if (active && over && active.id !== over.id) {
			setData((data) => {
				const oldIndex = dataIds.indexOf(active.id)
				const newIndex = dataIds.indexOf(over.id)
				return arrayMove(data, oldIndex, newIndex)
			})
		}
	}

	return (
		<Card>
			<CardHeader className="items-start md:grid md:grid-cols-[1fr_auto]">
				<CardTitle>
					<Trans>Data Table</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Data Table is a table that displays data in a grid format.
					</Trans>
				</CardDescription>

				<CardAction className="flex items-center gap-2 pt-2 md:pt-0">
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Button variant="outline" size="sm">
									<Icon name="activity" />
									<span className="hidden lg:inline">
										<Trans>Customize Columns</Trans>
									</span>
									<span className="lg:hidden">
										<Trans>Columns</Trans>
									</span>
									<Icon name="chevron-down" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
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
						<Button variant="outline" size="sm">
							<Icon name="plus" />
							<span className="hidden lg:inline">
								<Trans>Add Section</Trans>
							</span>
						</Button>
					</div>
				</CardAction>
			</CardHeader>
			<CardContent className="p-0">
				<section className="bg-muted dark:bg-background relative isolate mx-auto flex w-full max-w-none flex-col overflow-hidden rounded-2xl px-1.5">
					<div className="relative isolate order-1 -m-1">
						<div className="after:bg-card dark:after:bg-muted after:absolute after:inset-0 after:top-10 after:z-[-1] after:rounded-xl">
							<div className="before:ring-muted dark:before:ring-background after:border-border overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:top-10 before:z-10 before:rounded-xl before:ring-2 after:pointer-events-none after:absolute after:inset-0 after:top-10 after:z-20 after:rounded-xl after:border">
								<div className="relative overflow-x-auto rounded-xl">
									<DndContext
										collisionDetection={closestCenter}
										modifiers={[restrictToVerticalAxis]}
										onDragEnd={handleDragEnd}
										sensors={sensors}
										id={sortableId}
									>
										<table className="relative min-w-full table-fixed whitespace-nowrap">
											<thead>
												{table.getHeaderGroups().map((headerGroup) => (
													<tr key={headerGroup.id} className="group">
														{headerGroup.headers.map((header) => {
															return (
																<th
																	key={header.id}
																	colSpan={header.colSpan}
																	className="text-foreground overflow-hidden px-2 pt-3 pb-2 text-left text-sm font-medium"
																>
																	<span
																		className={cn(
																			'inline-flex',
																			header.id === 'select' &&
																				'flex justify-center',
																		)}
																	>
																		{header.isPlaceholder
																			? null
																			: flexRender(
																					header.column.columnDef.header,
																					header.getContext(),
																				)}
																	</span>
																</th>
															)
														})}
													</tr>
												))}
											</thead>
											<tbody className="relative">
												{table.getRowModel().rows?.length ? (
													<SortableContext
														items={dataIds}
														strategy={verticalListSortingStrategy}
													>
														{table.getRowModel().rows.map((row) => (
															<DraggableRowStyled key={row.id} row={row} />
														))}
													</SortableContext>
												) : (
													<tr className="group/table-row hover:bg-muted/50 [&+&]:border-border [&+&]:border-t">
														<td
															colSpan={columns.length}
															className="overflow-hidden border-0 px-4 py-2 text-center"
														>
															<span className="text-muted-foreground text-sm">
																<Trans>No results.</Trans>
															</span>
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</DndContext>
								</div>
							</div>
						</div>
					</div>
				</section>
				{/* <div className="flex items-center justify-between px-4">
					<div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
						{table.getFilteredSelectedRowModel().rows.length} of{' '}
						{table.getFilteredRowModel().rows.length} row(s) selected.
					</div>
					<div className="flex w-full items-center gap-8 lg:w-fit">
						<div className="hidden items-center gap-2 lg:flex">
							<Label htmlFor="rows-per-page" className="text-sm font-medium">
								Rows per page
							</Label>
							<Select
								value={`${table.getState().pagination.pageSize}`}
								onValueChange={(value) => {
									table.setPageSize(Number(value))
								}}
							>
								<SelectTrigger size="sm" className="w-20" id="rows-per-page">
									<SelectValue
										placeholder={table.getState().pagination.pageSize}
									/>
								</SelectTrigger>
								<SelectContent side="top">
									{[10, 20, 30, 40, 50].map((pageSize) => (
										<SelectItem key={pageSize} value={`${pageSize}`}>
											{pageSize}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex w-fit items-center justify-center text-sm font-medium">
							Page {table.getState().pagination.pageIndex + 1} of{' '}
							{table.getPageCount()}
						</div>
						<div className="ml-auto flex items-center gap-2 lg:ml-0">
							<Button
								variant="outline"
								className="hidden h-8 w-8 p-0 lg:flex"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
							>
								<span className="sr-only">Go to first page</span>
								<Icon name="chevrons-left" />
							</Button>
							<Button
								variant="outline"
								className="size-8"
								size="icon"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<span className="sr-only">Go to previous page</span>
								<Icon name="chevron-left" />
							</Button>
							<Button
								variant="outline"
								className="size-8"
								size="icon"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<span className="sr-only">Go to next page</span>
								<Icon name="chevron-right" />
							</Button>
							<Button
								variant="outline"
								className="hidden size-8 lg:flex"
								size="icon"
								onClick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}
							>
								<span className="sr-only">Go to last page</span>
								<Icon name="chevrons-right" />
							</Button>
						</div>
					</div>
				</div> */}
			</CardContent>
		</Card>
	)
}

const chartData = [
	{ month: 'January', desktop: 186, mobile: 80 },
	{ month: 'February', desktop: 305, mobile: 200 },
	{ month: 'March', desktop: 237, mobile: 120 },
	{ month: 'April', desktop: 73, mobile: 190 },
	{ month: 'May', desktop: 209, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
]

const chartConfig = {
	desktop: {
		label: 'Desktop',
		color: 'var(--primary)',
	},
	mobile: {
		label: 'Mobile',
		color: 'var(--primary)',
	},
} satisfies ChartConfig

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
	const isMobile = useIsMobile()

	return (
		<Drawer direction={isMobile ? 'bottom' : 'right'}>
			<DrawerTrigger>
				<Button variant="link" className="text-foreground w-fit px-0 text-left">
					{item.header}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader className="gap-1">
					<DrawerTitle>{item.header}</DrawerTitle>
					<DrawerDescription>
						<Trans>Showing total visitors for the last 6 months</Trans>
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
					{!isMobile && (
						<>
							<ChartContainer config={chartConfig}>
								<AreaChart
									accessibilityLayer
									data={chartData}
									margin={{
										left: 0,
										right: 10,
									}}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="month"
										tickLine={false}
										axisLine={false}
										tickMargin={8}
										tickFormatter={(value) => value.slice(0, 3)}
										hide
									/>
									<ChartTooltip
										cursor={false}
										content={<ChartTooltipContent indicator="dot" />}
									/>
									<Area
										dataKey="mobile"
										type="natural"
										fill="var(--color-mobile)"
										fillOpacity={0.6}
										stroke="var(--color-mobile)"
										stackId="a"
									/>
									<Area
										dataKey="desktop"
										type="natural"
										fill="var(--color-desktop)"
										fillOpacity={0.4}
										stroke="var(--color-desktop)"
										stackId="a"
									/>
								</AreaChart>
							</ChartContainer>
							<Separator />
							<div className="grid gap-2">
								<div className="flex gap-2 leading-none font-medium">
									Trending up by 5.2% this month{' '}
									<Icon name="trending-up" className="size-4" />
								</div>
								<div className="text-muted-foreground">
									Showing total visitors for the last 6 months. This is just
									some random text to test the layout. It spans multiple lines
									and should wrap around.
								</div>
							</div>
							<Separator />
						</>
					)}
					<form className="flex flex-col gap-4">
						<div className="flex flex-col gap-3">
							<Label htmlFor="header">
								<Trans>Header</Trans>
							</Label>
							<Input id="header" defaultValue={item.header} />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-3">
								<Label htmlFor="type">
									<Trans>Type</Trans>
								</Label>
								<Select defaultValue={item.type}>
									<SelectTrigger id="type" className="w-full">
										Select a type
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Table of Contents">
											Table of Contents
										</SelectItem>
										<SelectItem value="Executive Summary">
											Executive Summary
										</SelectItem>
										<SelectItem value="Technical Approach">
											Technical Approach
										</SelectItem>
										<SelectItem value="Design">Design</SelectItem>
										<SelectItem value="Capabilities">Capabilities</SelectItem>
										<SelectItem value="Focus Documents">
											Focus Documents
										</SelectItem>
										<SelectItem value="Narrative">Narrative</SelectItem>
										<SelectItem value="Cover Page">Cover Page</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-3">
								<Label htmlFor="status">
									<Trans>Status</Trans>
								</Label>
								<Select defaultValue={item.status}>
									<SelectTrigger id="status" className="w-full">
										{useLingui()._(msg`Select a status`)}
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Done">Done</SelectItem>
										<SelectItem value="In Progress">In Progress</SelectItem>
										<SelectItem value="Not Started">Not Started</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-3">
								<Label htmlFor="target">
									<Trans>Target</Trans>
								</Label>
								<Input id="target" defaultValue={item.target} />
							</div>
							<div className="flex flex-col gap-3">
								<Label htmlFor="limit">
									<Trans>Limit</Trans>
								</Label>
								<Input id="limit" defaultValue={item.limit} />
							</div>
						</div>
						<div className="flex flex-col gap-3">
							<Label>
								<Trans>Reviewers</Trans>
							</Label>
							<div className="flex flex-wrap gap-2">
								{/* Current reviewers */}
								{item.reviewers.map((reviewer) => (
									<div
										key={reviewer}
										className="bg-primary/10 text-primary flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
									>
										<Avatar className="size-5">
											<AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
												{getInitials(reviewer)}
											</AvatarFallback>
										</Avatar>
										<span>{reviewer}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="hover:bg-primary/20 ml-1 size-4 rounded-full"
											onClick={() => {
												// Remove reviewer functionality would go here
												toast.success(`Removed ${reviewer}`)
											}}
										>
											<Icon name="x" className="size-3" />
											<span className="sr-only">Remove {reviewer}</span>
										</Button>
									</div>
								))}

								{/* Add reviewer button */}
								<DropdownMenu>
									<DropdownMenuTrigger>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="text-muted-foreground hover:text-primary border-dashed"
										>
											<Icon name="plus" className="mr-1 size-4" />
											Add Reviewer
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="w-52">
										{AVAILABLE_REVIEWERS.filter(
											(reviewer) => !item.reviewers.includes(reviewer),
										).map((reviewer) => (
											<DropdownMenuItem
												key={reviewer}
												onSelect={() => {
													// Add reviewer functionality would go here
													toast.success(`Added ${reviewer}`)
												}}
											>
												<div className="flex items-center gap-2">
													<Avatar className="size-6">
														<AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
															{getInitials(reviewer)}
														</AvatarFallback>
													</Avatar>
													{reviewer}
												</div>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					</form>
				</div>
				<DrawerFooter>
					<Button>
						<Trans>Submit</Trans>
					</Button>
					<DrawerClose>
						<Button variant="outline">
							<Trans>Done</Trans>
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
