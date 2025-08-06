import { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
	SortableContext,
	verticalListSortingStrategy,
	arrayMove,
	useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { NoteCard } from './notes-cards.tsx'

type Note = {
	id: string
	title: string
	content: string
	createdAt: string
	updatedAt: string
	isPublic: boolean
	createdById: string
	status?: string | null
	position?: number | null
	uploads?: Array<{
		id: string
		type: string
		altText: string | null
		objectKey: string
		thumbnailKey?: string | null
		status?: string
	}>
	createdBy?: {
		name: string | null
		username: string | null
	} | null
	noteAccess: Array<{
		userId: string
	}>
	createdByName: string
}

interface NotesKanbanBoardProps {
	notes: Note[]
	orgSlug: string
}

type Column = {
	id: string // status string or "Uncategorized"
	title: string
}

const UNCATEGORIZED_ID = '__uncategorized'

function getInitialColumns(notes: Note[]): Column[] {
	const statuses = Array.from(
		new Set(notes.map(n => n.status).filter(Boolean) as string[]),
	)
	const columns: Column[] = statuses.map(s => ({
		id: s,
		title: s,
	}))
	if (notes.some(n => !n.status)) {
		columns.unshift({ id: UNCATEGORIZED_ID, title: 'Uncategorized' })
	}
	return columns.length > 0 ? columns : [{ id: UNCATEGORIZED_ID, title: 'Uncategorized' }]
}

export function NotesKanbanBoard({ notes, orgSlug }: NotesKanbanBoardProps) {
	const [columns, setColumns] = useState<Column[]>(() => getInitialColumns(notes))

	useEffect(() => {
		// Sync columns if notes change externally
		setColumns(getInitialColumns(notes))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(notes.map(n => n.status))])

	const notesByStatus = useMemo(() => {
		const map: Record<string, Note[]> = {}
		for (const col of columns) map[col.id] = []
		for (const note of notes) {
			const status = note.status ?? UNCATEGORIZED_ID
			if (!map[status]) map[status] = []
			map[status].push(note)
		}
		// Sort by position, fallback to updatedAt
		for (const colId of Object.keys(map)) {
			map[colId].sort((a, b) => {
				if (a.position != null && b.position != null) {
					return a.position - b.position
				}
				if (a.position != null) return -1
				if (b.position != null) return 1
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			})
		}
		return map
	}, [notes, columns])

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

	const handleDragEnd = async (event: any) => {
		const { active, over } = event
		if (!active || !over) return
		const noteId = active.id
		const [overColId, overIdxStr] = over.id.split('___')
		const overIdx = Number(overIdxStr)
		const status = overColId === UNCATEGORIZED_ID ? null : overColId
		const position = overIdx

		// Optimistically update UI (optional)

		// Persist to backend
		await fetch(`/app/${orgSlug}/notes/reorder`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ noteId, status, position }),
		})
	}

	const handleAddColumn = () => {
		const name = prompt('New column name?')
		if (!name) return
		if (columns.some(col => col.title === name)) {
			alert('Column already exists')
			return
		}
		setColumns([...columns, { id: name, title: name }])
	}

	return (
		<div className="flex gap-6 overflow-x-auto py-2">
			{columns.map((col, colIdx) => (
				<ColumnView
					key={col.id}
					column={col}
					notes={notesByStatus[col.id] || []}
					colIdx={colIdx}
					orgSlug={orgSlug}
					onDragEnd={handleDragEnd}
				/>
			))}
			{/* Add column */}
			<div className="flex flex-col justify-start min-w-[260px]">
				<Button
					variant="secondary"
					className="mt-2"
					onClick={handleAddColumn}
					title="Add new column"
				>
					<Icon name="plus" className="mr-1" /> Add column
				</Button>
			</div>
		</div>
	)
}

function ColumnView({
	column,
	notes,
	colIdx,
	orgSlug,
	onDragEnd,
}: {
	column: Column
	notes: Note[]
	colIdx: number
	orgSlug: string
	onDragEnd: (event: any) => void
}) {
	return (
		<div className="flex flex-col min-w-[320px] bg-muted/60 rounded-lg p-3 shadow-sm">
			<div className="font-semibold mb-3">{column.title}</div>
			<DndContext
				sensors={useSensors(useSensor(PointerSensor))}
				collisionDetection={closestCorners}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={notes.map((n, idx) => ({
						id: `${column.id}___${idx}`,
						noteId: n.id,
					}))}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-3">
						{notes.map((note, idx) => (
							<SortableNoteCard
								key={note.id}
								id={`${column.id}___${idx}`}
								note={note}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
}

function SortableNoteCard({ id, note }: { id: string; note: Note }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id,
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		cursor: 'grab',
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<NoteCard note={note} />
		</div>
	)
}