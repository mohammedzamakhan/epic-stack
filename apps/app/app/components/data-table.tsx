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
import {
	Avatar,
	AvatarFallback,
	Badge,
	Button,
	Checkbox,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	Input,
	Label,
	Separator,
	TableCell,
	TableRow,
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	cn,
	Card,
	CardTitle,
	CardDescription,
	CardHeader,
	CardContent,
	CardHeaderContent,
	CardAction,
} from '@repo/ui'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

import { useIsMobile } from '#app/hooks/use-mobile'

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
			<span className="sr-only">Drag to reorder</span>
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
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
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
		header: 'Header',
		cell: ({ row }) => {
			return <TableCellViewer item={row.original} />
		},
		enableHiding: false,
	},
	{
		accessorKey: 'type',
		header: 'Section Type',
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
		header: 'Status',
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
		header: () => <div className="w-full">Target</div>,
		cell: ({ row }) => (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
						loading: `Saving ${row.original.header}`,
						success: 'Done',
						error: 'Error',
					})
				}}
			>
				<Label htmlFor={`${row.original.id}-target`} className="sr-only">
					Target
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
		header: () => <div className="w-full">Limit</div>,
		cell: ({ row }) => (
			<form
				onSubmit={(e) => {
					e.preventDefault()
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
						loading: `Saving ${row.original.header}`,
						success: 'Done',
						error: 'Error',
					})
				}}
			>
				<Label htmlFor={`${row.original.id}-limit`} className="sr-only">
					Limit
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
		header: 'Reviewers',
		cell: ({ row }) => {
			const reviewers = row.original.reviewers || []
			const availableReviewers = AVAILABLE_REVIEWERS.filter(
				(reviewer) => !reviewers.includes(reviewer)
			)

			const addReviewer = (newReviewer: string) => {
				// Here you would typically update the data state
				// For now, we'll just show a toast
				toast.success(`Added ${newReviewer} as reviewer`)
			}

			return (
				<div className="flex items-center gap-1 max-w-44">
					{/* Existing reviewer avatars */}
					{reviewers.map((reviewer) => (
						<Avatar key={reviewer} className="size-7 border-2 border-background">
							<AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
								{getInitials(reviewer)}
							</AvatarFallback>
						</Avatar>
					))}
					
					{/* Plus button to add new reviewer */}
					{availableReviewers.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-7 rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
								>
									<Icon name="plus" className="size-3" />
									<span className="sr-only">Add reviewer</span>
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
												<AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
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
						<span className="text-muted-foreground text-sm">All assigned</span>
					)}
				</div>
			)
		},
	},
	{
		id: 'actions',
		cell: () => (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
						size="icon"
					>
						<Icon name="more-vertical" />
						<span className="sr-only">Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem>Edit</DropdownMenuItem>
					<DropdownMenuItem>Make a copy</DropdownMenuItem>
					<DropdownMenuItem>Favorite</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	},
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
	const { transform, transition, setNodeRef, isDragging } = useSortable({
		id: row.original.id,
	})

	return (
		<TableRow
			data-state={row.getIsSelected() && 'selected'}
			data-dragging={isDragging}
			ref={setNodeRef}
			className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
			style={{
				transform: CSS.Transform.toString(transform),
				transition: transition,
			}}
		>
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	)
}

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
			<CardHeader className="md:grid md:grid-cols-[1fr_auto] items-start">
				<CardHeaderContent>
					<CardTitle>
						Data Table
					</CardTitle>
					<CardDescription>
						Data Table is a table that displays data in a grid format.
					</CardDescription>
				</CardHeaderContent>
				<CardAction className="flex items-center gap-2 pt-2 md:pt-0">
				<div className="flex items-center gap-2">
		 			<DropdownMenu>
		 				<DropdownMenuTrigger asChild>
		 					<Button variant="outline" size="sm">
		 						<Icon name="activity" />
		 						<span className="hidden lg:inline">Customize Columns</span>
		 						<span className="lg:hidden">Columns</span>
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
		 				<span className="hidden lg:inline">Add Section</span>
		 			</Button>
		 		</div>
				</CardAction>
			</CardHeader>
			<CardContent className="p-0">
			<section className="bg-muted dark:bg-background relative isolate mx-auto flex max-w-none flex-col overflow-hidden rounded-2xl w-full px-1.5">
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
																	<span className={cn('inline-flex', header.id === 'select' && 'flex justify-center')}>
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
																No results.
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
			<DrawerTrigger asChild>
				<Button variant="link" className="text-foreground w-fit px-0 text-left">
					{item.header}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader className="gap-1">
					<DrawerTitle>{item.header}</DrawerTitle>
					<DrawerDescription>
						Showing total visitors for the last 6 months
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
							<Label htmlFor="header">Header</Label>
							<Input id="header" defaultValue={item.header} />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-3">
								<Label htmlFor="type">Type</Label>
								<Select defaultValue={item.type}>
									<SelectTrigger id="type" className="w-full">
										<SelectValue placeholder="Select a type" />
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
								<Label htmlFor="status">Status</Label>
								<Select defaultValue={item.status}>
									<SelectTrigger id="status" className="w-full">
										<SelectValue placeholder="Select a status" />
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
								<Label htmlFor="target">Target</Label>
								<Input id="target" defaultValue={item.target} />
							</div>
							<div className="flex flex-col gap-3">
								<Label htmlFor="limit">Limit</Label>
								<Input id="limit" defaultValue={item.limit} />
							</div>
						</div>
						<div className="flex flex-col gap-3">
							<Label>Reviewers</Label>
							<div className="flex flex-wrap gap-2">
								{/* Current reviewers */}
								{item.reviewers.map((reviewer) => (
									<div
										key={reviewer}
										className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
									>
										<Avatar className="size-5">
											<AvatarFallback className="text-xs bg-primary/20 text-primary font-medium">
												{getInitials(reviewer)}
											</AvatarFallback>
										</Avatar>
										<span>{reviewer}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-4 hover:bg-primary/20 rounded-full ml-1"
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
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="border-dashed text-muted-foreground hover:text-primary"
										>
											<Icon name="plus" className="size-4 mr-1" />
											Add Reviewer
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="w-52">
										{AVAILABLE_REVIEWERS.filter(
											(reviewer) => !item.reviewers.includes(reviewer)
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
														<AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
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
					<Button>Submit</Button>
					<DrawerClose asChild>
						<Button variant="outline">Done</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
