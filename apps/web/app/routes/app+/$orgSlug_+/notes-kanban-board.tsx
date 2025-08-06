import { useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher, useFetchers } from 'react-router'
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
	statusId?: string | null
	statusName?: string | null
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
		columns.push({ id: stat.id, title: stat.name, statusName: stat.name, statusId: stat.id })
	}
	// Add Uncategorized if notes exist with no statusId
	if (notes.some(n => !n.statusId)) {
		columns.unshift({ id: UNCATEGORIZED_ID, title: 'Uncategorized' })
	}
	// Add legacy statuses from notes not in DB (should be rare)
	const legacy = Array.from(
		new Set(notes.map(n => n.statusId).filter(sid => sid && !statuses.some(st => st.id === sid)) as string[])
	)
	for (const legacyStatusId of legacy) {
		columns.push({ id: legacyStatusId, title: legacyStatusId, statusId: legacyStatusId })
	}
	return columns.length > 0 ? columns : [{ id: UNCATEGORIZED_ID, title: 'Uncategorized' }]
}

export function NotesKanbanBoard({ notes, orgSlug, statuses }: NotesKanbanBoardProps) {
	const [columns, setColumns] = useState<Column[]>(() => getInitialColumns(statuses, notes))
	const [addingColumn, setAddingColumn] = useState(false)
	const [newColInput, setNewColInput] = useState('')
	const addColumnFetcher = useFetcher()
	const reorderFetcher = useFetcher();
	const fetchers = useFetchers();
	const [draggingId, setDraggingId] = useState<string | null>(null);

	// Helpers to overlay optimistic fetchers onto canonical data

	// 1. Pending note reorder (and creation)
	function getPendingNotes(): Partial<Note>[] {
		return fetchers
			.filter(f => f.formData && f.formData.get('intent') === 'reorder-note')
			.map(f => ({
				id: String(f.formData!.get('noteId')),
				statusId: f.formData!.get('statusId') ? String(f.formData!.get('statusId')) : null,
				position: Number(f.formData!.get('position')),
			}));
	}
	function getPendingCreates(): Partial<Note>[] {
		return fetchers
			.filter(f => f.formData && f.formData.get('intent') === 'create-note')
			.map(f => ({
				id: String(f.formData!.get('noteId')),
				title: String(f.formData!.get('title')),
				content: String(f.formData!.get('content') ?? ''),
				statusId: f.formData!.get('statusId') ? String(f.formData!.get('statusId')) : null,
				position: Number(f.formData!.get('position')),
				createdByName: 'You',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				isPublic: true,
				createdById: '', // could use userId from context
				noteAccess: [],
			}));
	}

	// 2. Pending column/status creates & renames
	function getPendingStatusRenames(): Record<string, string> {
		const map: Record<string, string> = {};
		fetchers
			.filter(f => f.formData && f.formData.get('intent') === 'rename-status')
			.forEach(f => {
				const sid = String(f.formData!.get('statusId'));
				const name = String(f.formData!.get('name'));
				if (sid && name) map[sid] = name;
			});
		return map;
	}
	function getPendingStatusCreates(): Array<{ id: string; title: string }> {
		return fetchers
			.filter(f => f.formData && f.formData.get('intent') === 'create-status')
			.map(f => {
				const name = String(f.formData!.get('name'));
				return { id: name, title: name };
			});
	}

	// Build columns: base from loader, overlay pending status renames and adds
	const pendingStatusRenames = getPendingStatusRenames();
	const pendingStatusCreates = getPendingStatusCreates();
	const mergedColumns: Column[] = useMemo(() => {
		const baseCols: Column[] = [];
		for (const stat of statuses) {
			baseCols.push({
				id: stat.id,
				title: pendingStatusRenames[stat.id] ?? stat.name,
				statusName: pendingStatusRenames[stat.id] ?? stat.name,
				statusId: stat.id,
			});
		}
		if (notes.some(n => !n.statusId)) {
			baseCols.unshift({ id: UNCATEGORIZED_ID, title: 'Uncategorized' });
		}
		for (const pending of pendingStatusCreates) {
			if (!baseCols.some(c => c.id === pending.id))
				baseCols.push({ ...pending });
		}
		return baseCols;
	}, [statuses, notes, pendingStatusRenames, pendingStatusCreates]);

	// Build notes: overlay pending reorder/creates
	const pendingNotes = getPendingNotes();
	const pendingCreates = getPendingCreates();
	const mergedNotes: Note[] = useMemo(() => {
		const noteMap = new Map<string, Note>();
		for (const n of notes) noteMap.set(n.id, { ...n });
		for (const patch of pendingNotes) {
			if (patch.id && noteMap.has(patch.id)) {
				const n = noteMap.get(patch.id)!;
				n.statusId = patch.statusId;
				if (patch.position !== undefined) n.position = patch.position;
			}
		}
		// Add pending note creates
		for (const pending of pendingCreates) {
			if (pending.id && !noteMap.has(pending.id)) {
				noteMap.set(pending.id, pending as Note);
			}
		}
		return Array.from(noteMap.values());
	}, [notes, pendingNotes, pendingCreates]);

	const notesByStatus = useMemo(() => {
		const map: Record<string, Note[]> = {};
		for (const col of mergedColumns) map[col.id] = [];
		for (const note of mergedNotes) {
			const statusKey = note.statusId ?? UNCATEGORIZED_ID;
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
	}, [mergedNotes, mergedColumns]);

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
		const statusId = destColId === UNCATEGORIZED_ID ? null : destColId;

		// Show drag feedback: set draggingId for CSS
		setDraggingId(noteId);

		const formData = new FormData();
		formData.append('intent', 'reorder-note');
		formData.append('noteId', noteId);
		formData.append('position', String(destIndex));
		if (statusId !== null) formData.append('statusId', statusId);
		reorderFetcher.submit(formData, { method: 'POST', action: `/app/${orgSlug}/notes/reorder` });

		// Reset draggingId after a tick (after optimistic fetcher overlays)
		setTimeout(() => setDraggingId(null), 250);
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
				{mergedColumns.map((col) => (
					<ColumnView
						key={col.id}
						column={col}
						notes={notesByStatus[col.id] || []}
						columns={mergedColumns}
						orgSlug={orgSlug}
						draggingId={draggingId}
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
	orgSlug,
	draggingId,
}: {
	column: Column
	notes: Note[]
	columns: Column[]
	orgSlug: string
	draggingId?: string | null
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
		formData.append('intent', 'rename-status')
		formData.append('statusId', column.statusId)
		formData.append('name', newName)
		renameColumnFetcher.submit(formData, { method: 'PATCH', action: `/app/${orgSlug}/notes/status/${column.statusId}` })
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
						className="w-32 h-7"
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
								<Icon name="pencil" size="xs" />
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
								isDragging={draggingId === note.id}
							/>
						))}
				</div>
			</SortableContext>
		</div>
	)
}

function SortableNoteCard({ id, note, isDragging }: { id: string; note: Note; isDragging?: boolean }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortableIsDragging } = useSortable({
		id,
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging || sortableIsDragging ? 0.3 : 1,
		cursor: 'grab',
	}

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			<NoteCard note={note} />
		</div>
	)
}