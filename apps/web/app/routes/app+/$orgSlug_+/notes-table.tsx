import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from '@tanstack/react-table'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'

export type Note = {
	id: string
	title: string
	content: string
	createdAt: string
	updatedAt: string
	createdByName?: string
	images: Array<{
		id: string
		altText: string | null
		objectKey: string
	}>
}

export function NotesTable({ notes }: { notes: Note[] }) {
	const [sorting, setSorting] = useState<SortingState>([])
	const navigate = useNavigate()

	const columns: ColumnDef<Note>[] = [
		{
			accessorKey: 'title',
			header: 'Title',
			cell: ({ row }) => {
				return <div className="font-medium">{row.getValue('title')}</div>
			},
		},
		{
			accessorKey: 'updatedAt',
			header: 'Last Updated',
			cell: ({ row }) => {
				const date = new Date(row.original.updatedAt)
				const timeAgo = formatDistanceToNow(date, { addSuffix: true })
				return <div className="text-muted-foreground">{timeAgo}</div>
			},
			sortingFn: 'datetime',
		},
		{
			accessorKey: 'createdByName',
			header: 'Created By',
			cell: ({ row }) => {
				const createdBy = row.original.createdByName || 'Unknown'
				return <div className="text-muted-foreground">{createdBy}</div>
			},
		},
		{
			id: 'actions',
			cell: ({ row }) => {
				const note = row.original
				return (
					<div className="flex justify-end gap-2">
						<Button variant="ghost" size="icon" asChild>
							<Link to={`${note.id}`} onClick={(e) => e.stopPropagation()}>
								<Icon name="search" className="size-4" />
							</Link>
						</Button>
						<Button variant="ghost" size="icon" asChild>
							<Link to={`${note.id}/edit`} onClick={(e) => e.stopPropagation()}>
								<Icon name="pencil" className="size-4" />
							</Link>
						</Button>
					</div>
				)
			},
		},
	]

	const table = useReactTable({
		data: notes,
		columns,
		state: {
			sorting,
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	})

	function handleRowClick(note: Note) {
		void navigate(`${note.id}`)
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}
								className="cursor-pointer"
								onClick={() => handleRowClick(row.original)}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-24 text-center">
								No notes found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	)
}

// DeleteNote component moved to the individual note view
