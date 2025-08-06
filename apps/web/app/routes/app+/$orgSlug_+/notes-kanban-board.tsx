import { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import {
	SortableContext,
	verticalListSortingStrategy,
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

interface Status {
	id: string
	name: string
	position: number | null
}

interface NotesKanbanBoardProps {
	notes: Note[]
	orgSlug: string
	statuses: Status[]
}

type Column = {
	id: string // status id or UNCATEGORIZED_ID or legacy string fallback
	title: string
	statusName?: string // for status columns, the name of the status
	statusId?: string   // for status columns, the id of the status
}

const UNCATEGORIZED_ID = '__uncategorized'

function getInitialColumns(statuses: Status[], notes: Note[]): Column[] {
	const columns: Column[] = []
	// Add status columns from DB
	for (const stat of statuses) {
		columns.push({ id: stat.name, title: stat.name, statusName: stat.name, statusId: stat.id })
	}
	// Add Uncategorized if notes exist with no status
	if (notes.some(n => !n.status)) {
		columns.unshift({ id: UNCATEGORIZED_ID, title: 'Uncategorized' })
	}
	// Add legacy statuses from notes not in DB
	const legacy = Array.from(
		new Set(notes.map(n => n.status).filter(Boolean) as string[]),
	).filter(s => !statuses.some(st => st.name === s))
	for (const legacyStatus of legacy) {
		columns.push({ id: legacyStatus, title: legacyStatus, statusName: legacyStatus })
	}
	return columns.length > 0 ? columns : [{ id: UNCATEGORIZED_ID, title: 'Uncategorized' }]
}

export function NotesKanbanBoard({ notes, orgSlug, statuses }: NotesKanbanBoardProps) {
	const [columns, setColumns] = useState<Column[]>(() => getInitialColumns(statuses, notes))
	const reorderFetcher = useFetcher();

	const notesByStatus = useMemo(() => {
		const map: Record<string, Note[]> = {};
		for (const col of columns) map[col.id] = [];
		for (const note of notes) {
			const statusKey = note.status ?? UNCATEGORIZED_ID;
			if (!map[statusKey]) map[statusKey] = [];
			map[statusKey].push(note);
		}
		for (const colId of Object.keys(map)) {
			map[colId].sort((a, b) => {
				if (a.position != null && b.position != null) return a.position - b.position;
				if (a.position != null) return -1;
				if (b.position != null) return 1;
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			});
		}
		return map;
	}, [notes, columns]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const getColId = (id: string) => id.includes('___') ? id.split('___')[0] : id;

	const handleDragEnd = (event: any) => {
		const { active, over } = event;
		if (!over) return;
		const noteId = active.id.toString().split('___')[1] ?? active.id.toString();
		const sourceColId = getColId(active.id.toString());
		const destColId = getColId(over.id.toString());
		if (sourceColId === destColId && active.id === over.id) return;
		const destNotes = [...notesByStatus[destColId] ?? []];
		let destIndex;
		if (over.id.toString() === destColId) {
			destIndex = destNotes.length; // dropped on empty space
		} else {
			destIndex = destNotes.findIndex(n => `${destColId}___${n.id}` === over.id.toString());
			if (destIndex === -1) destIndex = destNotes.length;
		}
		const status = destColId === UNCATEGORIZED_ID ? null : destColId;
		const formData = new FormData();
		formData.append('noteId', noteId);
		formData.append('position', String(destIndex));
		if (status !== null) formData.append('status', status);
		reorderFetcher.submit(formData, { method: 'POST', action: `/app/${orgSlug}/notes/reorder` });
	}

	const handleAddColumn = async () => {
		const name = prompt('New column name?')
		if (!name) return
		if (columns.some(col => col.title === name)) {
			alert('Column already exists')
			return
		}
		try {
			const res = await fetch(`/app/${orgSlug}/notes/statuses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			})
			if (res.ok) {
				const newStatus = await res.json()
				setColumns(prev => [...prev, { id: newStatus.name, title: newStatus.name, statusName: newStatus.name, statusId: newStatus.id }])
			} else if (res.status === 409) {
				alert('A column with that name already exists.')
			} else {
				alert('Error creating column. Please try again.')
			}
		} catch (e) {
			alert('Network error creating column.')
		}
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
			<div className="flex gap-6 overflow-x-auto py-2">
				{columns.map((col) => (
					<ColumnView
						key={col.id}
						column={col}
						notes={notesByStatus[col.id] || []}
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
		</DndContext>
	)
}

function ColumnView({
	column,
	notes,
}: {
	column: Column
	notes: Note[]
}) {
	const { setNodeRef } = useDroppable({ id: column.id });
	return (
		<div ref={setNodeRef} className="flex flex-col min-w-[320px] bg-muted/60 rounded-lg p-3 shadow-sm">
			<div className="font-semibold mb-3">{column.title}</div>
			<SortableContext
				id={column.id}
				items={notes.length > 0 ? notes.map((n) => `${column.id}___${n.id}`) : [column.id]}
				strategy={verticalListSortingStrategy}
			>
				<div className="flex flex-col gap-3">
					{notes.map((note) => (
						<SortableNoteCard
							key={note.id}
							id={`${column.id}___${note.id}`}
							note={note}
						/>
					))}
				</div>
			</SortableContext>
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