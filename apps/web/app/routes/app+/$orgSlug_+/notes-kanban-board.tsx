import { useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import {
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { NoteCard } from './notes-cards.tsx'
import { CSS } from '@dnd-kit/utilities'

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
	const [addingColumn, setAddingColumn] = useState(false)
	const [newColInput, setNewColInput] = useState('')
	const addColumnFetcher = useFetcher()
	const [noteList, setNoteList] = useState<Note[]>(notes);
	const reorderFetcher = useFetcher();

	// Sync local noteList if notes prop changes
	useEffect(() => {
		setNoteList(notes);
	}, [notes]);

	const notesByStatus = useMemo(() => {
		const map: Record<string, Note[]> = {};
		for (const col of columns) map[col.id] = [];
		for (const note of noteList) {
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
	}, [noteList, columns]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	const getColId = (ident: unknown) => {
		const str = ident ? String(ident) : '';
		return str.includes('___') ? str.split('___')[0] : str;
	};

	const handleDragEnd = (event: any) => {
		const { active, over } = event;
		const activeIdStr = active?.id ? String(active.id) : null;
		if (!activeIdStr) return;
		const overIdStr = over?.id ? String(over.id) : null;
		if (!overIdStr) return;

		const noteId = activeIdStr.includes('___') ? activeIdStr.split('___')[1] : activeIdStr;
		const sourceColId = getColId(activeIdStr);
		const destColId = getColId(overIdStr);

		if (!destColId) return;
		if (sourceColId === destColId && activeIdStr === overIdStr) return;
		const destNotes = [...notesByStatus[destColId] ?? []];
		let destIndex;
		if (overIdStr === destColId) {
			destIndex = destNotes.length; // dropped on empty space
		} else {
			destIndex = destNotes.findIndex(n => `${destColId}___${n.id}` === overIdStr);
			if (destIndex === -1) destIndex = destNotes.length;
		}
		const status = destColId === UNCATEGORIZED_ID ? null : destColId;
		// Optimistic update
		setNoteList(prev => {
			const movingIdx = prev.findIndex(n => n.id === noteId);
			if (movingIdx === -1) return prev;
			const moving = { ...prev[movingIdx], status, position: destIndex };
			const remaining = prev.filter((_, i) => i !== movingIdx);
			const destArr: Note[] = [];
			const others: Note[] = [];
			remaining.forEach(n => {
				const colId = (n.status ?? UNCATEGORIZED_ID);
				if (colId === destColId) destArr.push(n);
				else others.push(n);
			});
			destArr.splice(destIndex, 0, moving);
			destArr.forEach((n, i) => { n.position = i; });
			// Also reindex source column positions if source and dest differ
			if (sourceColId !== destColId) {
				const sourceArr = [];
				const rest = [];
				others.forEach(n => {
					const colId = (n.status ?? UNCATEGORIZED_ID);
					if (colId === sourceColId) sourceArr.push(n);
					else rest.push(n);
				});
				sourceArr.forEach((n, i) => { n.position = i; });
				return [...rest, ...sourceArr, ...destArr];
			}
			return [...others, ...destArr];
		});
		const formData = new FormData();
		formData.append('noteId', noteId);
		formData.append('position', String(destIndex));
		if (status !== null) formData.append('status', status);
		reorderFetcher.submit(formData, { method: 'POST', action: `/app/${orgSlug}/notes/reorder` });
	}

	const handleAddColumnStart = () => {
		setAddingColumn(true)
		setNewColInput('')
	}
	const handleAddColumnSubmit = () => {
		const name = newColInput.trim()
		if (!name) {
			setAddingColumn(false)
			setNewColInput('')
			return
		}
		if (columns.some(col => col.title.toLowerCase() === name.toLowerCase())) {
			alert('A column with that name already exists.')
			return
		}
		const formData = new FormData()
		formData.append('name', name)
		addColumnFetcher.submit(formData, { method: 'POST', action: `/app/${orgSlug}/notes/statuses` })
		// Optimistically add
		setColumns(prev =>
			[...prev, { id: name, title: name, statusName: name }]
		)
		setAddingColumn(false)
		setNewColInput('')
	}
	// Sync new column with backend response id/name
	useEffect(() => {
		if (addColumnFetcher.data && addColumnFetcher.data.id) {
			setColumns(prev => {
				const idx = prev.findIndex(c => c.title === addColumnFetcher.data.name)
				if (idx !== -1) {
					const updated = [...prev]
					updated[idx] = {
						id: addColumnFetcher.data.name,
						title: addColumnFetcher.data.name,
						statusName: addColumnFetcher.data.name,
						statusId: addColumnFetcher.data.id,
						position: addColumnFetcher.data.position,
					}
					return updated
				}
				return prev
			})
		}
	}, [addColumnFetcher.data])

	return (
		<DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
			<div className="flex gap-6 overflow-x-auto py-2">
				{columns.map((col) => (
					<ColumnView
						key={col.id}
						column={col}
						notes={notesByStatus[col.id] || []}
						columns={columns}
						setColumns={setColumns}
						orgSlug={orgSlug}
					/>
				))}
				{/* Add column */}
				<div className="flex flex-col justify-start min-w-[260px]">
					{addingColumn ? (
						<Input
							autoFocus
							value={newColInput}
							onChange={e => setNewColInput(e.target.value)}
							onBlur={handleAddColumnSubmit}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									handleAddColumnSubmit()
								} else if (e.key === 'Escape') {
									setAddingColumn(false)
									setNewColInput('')
								}
							}}
							className="mt-2"
							placeholder="New column name"
							spellCheck={false}
							maxLength={24}
						/>
					) : (
						<Button
							variant="secondary"
							className="mt-2"
							onClick={handleAddColumnStart}
							title="Add new column"
						>
							<Icon name="plus" className="mr-1" /> Add column
						</Button>
					)}
				</div>
			</div>
		</DndContext>
	)
}

function ColumnView({
	column,
	notes,
	columns,
	setColumns,
	orgSlug,
}: {
	column: Column
	notes: Note[]
	columns: Column[]
	setColumns: React.Dispatch<React.SetStateAction<Column[]>>
	orgSlug: string
}) {
	const { setNodeRef } = useDroppable({ id: column.id });
	const [isEditing, setIsEditing] = useState(false)
	const [titleInput, setTitleInput] = useState(column.title)
	const inputRef = useRef<HTMLInputElement>(null)
	const renameColumnFetcher = useFetcher()
	const isUncategorized = column.id === UNCATEGORIZED_ID

	useEffect(() => {
		setTitleInput(column.title)
	}, [column.title])

	useEffect(() => {
		if (isEditing) inputRef.current?.focus()
	}, [isEditing])

	// On backend PATCH success, sync column name/id
	useEffect(() => {
		if (renameColumnFetcher.data && renameColumnFetcher.data.id) {
			setColumns(prev => prev.map(c =>
				c.statusId === column.statusId
					? { ...c, id: renameColumnFetcher.data.name, title: renameColumnFetcher.data.name, statusName: renameColumnFetcher.data.name }
					: c
			))
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [renameColumnFetcher.data])

	const handleRenameSubmit = () => {
		const newName = titleInput.trim()
		if (!column.statusId) {
			setIsEditing(false)
			setTitleInput(column.title)
			return
		}
		if (!newName || newName === column.title) {
			setIsEditing(false)
			setTitleInput(column.title)
			return
		}
		if (columns.some(c => c.title.toLowerCase() === newName.toLowerCase() && c.id !== column.id)) {
			alert('A column with that name already exists.')
			return
		}
		const formData = new FormData()
		formData.append('name', newName)
		renameColumnFetcher.submit(formData, { method: 'PATCH', action: `/app/${orgSlug}/notes/status/${column.statusId}` })
		// Optimistically update
		setColumns(prev => prev.map(c =>
			c.id === column.id
				? { ...c, id: newName, title: newName, statusName: newName }
				: c
		))
		setIsEditing(false)
	}

	return (
		<div ref={setNodeRef} className="flex flex-col min-w-[320px] bg-muted/60 rounded-lg p-3 shadow-sm">
			<div className="font-semibold mb-3 flex items-center gap-2 group">
				{isEditing ? (
					<Input
						ref={inputRef}
						value={titleInput}
						onChange={e => setTitleInput(e.target.value)}
						onBlur={handleRenameSubmit}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								handleRenameSubmit()
							} else if (e.key === 'Escape') {
								setIsEditing(false)
								setTitleInput(column.title)
							}
						}}
						className="w-32"
						maxLength={24}
						spellCheck={false}
					/>
				) : (
					<>
						<span>{column.title}</span>
						{!isUncategorized && (
							<span
								className={`ml-1 hidden rounded-sm p-1 text-muted-foreground group-hover:inline-block ${!column.statusId ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:bg-muted-foreground/10'}`}
								role="button"
								tabIndex={0}
								title={column.statusId ? "Rename column" : "Cannot rename"}
								onClick={() => column.statusId && setIsEditing(true)}
							>
								<Icon name="pencil" size={14} />
							</span>
						)}
					</>
				)}
			</div>
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