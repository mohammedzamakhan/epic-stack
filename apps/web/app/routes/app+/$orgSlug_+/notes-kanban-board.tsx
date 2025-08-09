import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type Announcements,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useFetcher, useFetchers } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { NoteCard } from './notes-cards.tsx'

type Note = LoaderNote & {
  position?: number | null
}
type LoaderNote = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  createdById: string
  createdByName: string
  statusId: string | null
  statusName: string | null
  uploads: Array<{
    id: string
    type: string
    altText: string | null
    objectKey: string
    thumbnailKey: string | null
    status: string
  }>
}

type Status = { id: string; name: string; position: number | null }
type Column = { id: string; name: string }

const UNCATEGORISED = '__uncategorised'
const SEPARATOR = ':::'
function makeDragId(columnId: string, noteId: string) {
  return `${columnId}${SEPARATOR}${noteId}`
}
function parseDragId(id: unknown): { columnId: string; noteId?: string } | null {
  if (!id || typeof id !== 'string') return null
  if (id.includes(SEPARATOR)) {
    const [columnId, noteId] = id.split(SEPARATOR)
    return { columnId: columnId || '', noteId }
  }
  return { columnId: id }
}

const collisionStrategy = (args: any) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

export function NotesKanbanBoard({
  notes,
  statuses,
  orgSlug,
}: {
  notes: LoaderNote[]
  statuses: Status[]
  orgSlug: string
}) {
  // --- Optimistic overlays from Remix fetchers ---
  const fetchers = useFetchers()

  // Pending note moves / creates
  const pendingNotes = fetchers
    .filter(f => f.formData?.get('intent') === 'reorder-note')
    .map(f => ({
      id: String(f.formData!.get('noteId')),
      statusId: (f.formData!.get('statusId') as string) ?? null,
      position: Number(f.formData!.get('position')),
    }))

  const pendingNoteCreates = fetchers
    .filter(f => f.formData?.get('intent') === 'create-note')
    .map(f => ({
      id: String(f.formData!.get('noteId')),
      title: String(f.formData!.get('title')),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: '',
      createdByName: 'You',
      statusId: (f.formData!.get('statusId') as string) ?? null,
      statusName: null,
      uploads: [],
    } as LoaderNote))

  // Pending status creates / renames / deletes
  const renameMap: Record<string, string> = {}
  fetchers
    .filter(f => f.formData?.get('intent') === 'rename-status')
    .forEach(f => {
      renameMap[String(f.formData!.get('statusId'))] = String(
        f.formData!.get('name'),
      )
    })

  const pendingCreatesStatus = fetchers
    .filter(f => f.formData?.get('intent') === 'create-status')
    .map(f => {
      const name = String(f.formData!.get('name'))
      return { id: name, name }
    })

  const pendingDeletes = new Set<string>()
  for (const f of fetchers) {
    if (f.formMethod === 'DELETE' && f.formAction?.includes('/notes/status/')) {
      const statusId = f.formAction.split('/').pop()
      if (statusId) pendingDeletes.add(statusId)
    }
  }

  // Build columns
  const columns: Column[] = [
    ...statuses
      .filter(s => !pendingDeletes.has(s.id))
      .map(s => ({
        id: s.id,
        name: renameMap[s.id] ?? s.name,
      })),
    ...pendingCreatesStatus,
  ]
  if (notes.some(n => !n.statusId)) columns.unshift({ id: UNCATEGORISED, name: 'Uncategorised' })

  // Build notes
  const noteMap = new Map<string, Note>()
  notes.forEach(n => noteMap.set(n.id, { ...n }))
  pendingNotes.forEach(p => {
    const n = noteMap.get(p.id)
    if (n) {
      n.statusId = p.statusId
      n.position = p.position
    }
  })
  pendingNoteCreates.forEach(n => noteMap.set(n.id, n))

  // Group by statusId
  const grouped: Record<string, Note[]> = {}
  columns.forEach(c => (grouped[c.id] = []))
  noteMap.forEach(n => {
    const bucket = grouped[n.statusId ?? UNCATEGORISED] ?? (grouped[n.statusId ?? UNCATEGORISED] = [])
    bucket.push(n)
  })
  Object.values(grouped).forEach(arr =>
    arr.sort(
      (a, b) =>
        (a.position ?? Number.POSITIVE_INFINITY) -
        (b.position ?? Number.POSITIVE_INFINITY),
    ),
  )

  // --- DnD-kit setup ---
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )
  const reorderFetcher = useFetcher()
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [dragDestination, setDragDestination] = useState<{
    columnId: string
    position?: number
  } | null>(null)

  function handleDragStart(ev: DragStartEvent) {
    const info = parseDragId(ev.active.id)
    if (info?.noteId && info.noteId !== '__placeholder') {
      setActiveNote(noteMap.get(info.noteId) ?? null)
    } else {
      setActiveNote(null)
    }
    setDragDestination(null)
  }

  function handleDragOver(ev: DragOverEvent) {
    const { active, over } = ev
    if (!over || !activeNote) return

    const activeParsed = parseDragId(active.id)
    const overParsed = parseDragId(over.id)
    const destColId = overParsed?.columnId ?? String(over.id)
    const overNoteId = overParsed?.noteId && overParsed.noteId !== '__placeholder' ? overParsed.noteId : null

    if (!destColId || !activeParsed?.noteId) return

    const list = grouped[destColId] ?? []
    let destIndex = list.length

    if (overNoteId) {
      const overIndex = list.findIndex(n => n.id === overNoteId)
      if (overIndex >= 0) destIndex = overIndex

      // If moving within same column and after itself, adjust index
      if (
        activeParsed.columnId === destColId &&
        overIndex > list.findIndex(n => n.id === activeParsed.noteId)
      ) {
        destIndex--
      }
    }

    // Only update if destination changed
    if (dragDestination?.columnId !== destColId || dragDestination?.position !== destIndex) {
      setDragDestination({ columnId: destColId, position: destIndex })
    }
  }

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev
    setActiveNote(null)
    setDragDestination(null)
    if (!over) return

    const activeParsed = parseDragId(active.id)
    const overParsed = parseDragId(over.id)
    const destColId = overParsed?.columnId ?? String(over.id)
    const overNoteId = overParsed?.noteId && overParsed.noteId !== '__placeholder' ? overParsed.noteId : null
    if (!destColId || !activeParsed?.noteId) return
    const list = grouped[destColId] ?? []
    let destIndex = list.length

    if (overNoteId) {
      const overIndex = list.findIndex(n => n.id === overNoteId)
      if (overIndex >= 0) destIndex = overIndex

      // If moving within same column and after itself, adjust index
      if (
        activeParsed.columnId === destColId &&
        overIndex > list.findIndex(n => n.id === activeParsed.noteId)
      ) {
        destIndex--
      }
    }

    const formData = new FormData()
    formData.append('intent', 'reorder-note')
    formData.append('noteId', activeParsed.noteId)
    formData.append('position', String(destIndex))
    if (destColId !== UNCATEGORISED) formData.append('statusId', destColId)
    void reorderFetcher.submit(formData, { method: 'post', action: `/app/${orgSlug}/notes/reorder` })
  }

  // Accessibility announcements for screen readers
  const announcements: Announcements = {
    onDragStart({ active }) {
      const info = parseDragId(active.id)
      if (info?.noteId && info.noteId !== '__placeholder') {
        const note = noteMap.get(info.noteId)
        const column = columns.find(c => c.id === info.columnId)
        return `Picked up note "${note?.title}" from column "${column?.name}"`
      }
      return 'Picked up draggable item'
    },
    onDragOver({ active, over }) {
      if (!over) return
      const activeInfo = parseDragId(active.id)
      const overInfo = parseDragId(over.id)
      const destColumn = columns.find(c => c.id === (overInfo?.columnId ?? over.id))

      if (activeInfo?.noteId && destColumn) {
        return `Moving note over column "${destColumn.name}"`
      }
      return 'Moving item'
    },
    onDragEnd({ active, over }) {
      if (!over) return 'Note dropped'
      const activeInfo = parseDragId(active.id)
      const overInfo = parseDragId(over.id)
      const destColumn = columns.find(c => c.id === (overInfo?.columnId ?? over.id))

      if (activeInfo?.noteId && destColumn) {
        const note = noteMap.get(activeInfo.noteId)
        return `Note "${note?.title}" dropped in column "${destColumn.name}"`
      }
      return 'Item dropped'
    },
    onDragCancel() {
      return 'Dragging cancelled'
    }
  }

  // --- Render ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveNote(null)
        setDragDestination(null)
      }}
      accessibility={{ announcements }}
    >
      <div className="flex gap-2 overflow-x-auto py-2 snap-x snap-mandatory">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            notes={grouped[col.id] ?? []}
            orgSlug={orgSlug}
            activeNote={activeNote}
            dragDestination={dragDestination}
          />
        ))}
        <NewColumnButton orgSlug={orgSlug} />
      </div>
      {typeof window !== 'undefined' && createPortal(
        <DragOverlay>
          {activeNote ? (
            <div className="rotate-3 shadow-lg">
              <NoteCard note={activeNote} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}

/* -------------------------------------------------------------------------- */
/*  Column                                                                    */
/* -------------------------------------------------------------------------- */

function KanbanColumn({
  column,
  notes,
  orgSlug,
  activeNote,
  dragDestination
}: {
  column: Column
  notes: Note[]
  orgSlug: string
  activeNote: Note | null
  dragDestination: { columnId: string; position?: number } | null
}) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const renameFetcher = useFetcher()
  const deleteFetcher = useFetcher()
  const dc = useDoubleCheck()
  const [editing, setEditing] = useState(false)

  const placeholderId = makeDragId(column.id, '__placeholder')
  const sortableItems = notes.length ? notes.map(n => makeDragId(column.id, n.id)) : [placeholderId]

  // Check if this column is the drag destination
  const isDestination = dragDestination?.columnId === column.id
  const dragPosition = dragDestination?.position ?? 0

  // Create display notes with preview
  const displayNotes = [...notes]
  if (isDestination && activeNote && !notes.find(n => n.id === activeNote.id)) {
    // Insert preview note at the correct position
    const previewNote = { ...activeNote, id: `${activeNote.id}-preview` }
    displayNotes.splice(dragPosition, 0, previewNote)
  }

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col min-w-[320px] max-w-[320px] bg-muted/30 rounded p-2 shadow-xs snap-center flex-shrink-0"
    >
      {/* header ------------------------------------------------------- */}
      <div className="font-semibold mb-1 flex items-center gap-2 group w-full">
        {editing ? (
          <renameFetcher.Form
            className="w-full"
            method="patch"
            action={`/app/${orgSlug}/notes/status/${column.id}`}
            onSubmit={() => setEditing(false)}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false)
            }}
          >
            <input type="hidden" name="intent" value="rename-status" />
            <input type="hidden" name="statusId" value={column.id} />
            <Input
              name="name"
              defaultValue={column.name}
              autoFocus
              className="w-full h-8 px-2"
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
            />
          </renameFetcher.Form>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            <button className="hover:underline" onClick={() => setEditing(true)}>
              <span className="text-sm">{column.name}</span>
              {column.id !== UNCATEGORISED && (
                <button className="invisible group-hover:visible p-1 px-2">
                  <Icon name="pencil" size="xs" />
                </button>
              )}
            </button>
            {column.id !== UNCATEGORISED && (
              <deleteFetcher.Form
                method="delete"
                action={`/app/${orgSlug}/notes/status/${column.id}`}
                className="invisible group-hover:visible"
              >
                <StatusButton
                  {...dc.getButtonProps({ type: 'submit' })}
                  variant={dc.doubleCheck ? 'destructive' : 'ghost'}
                  size="sm"
                  className="p-1 h-auto"
                  status={deleteFetcher.state !== 'idle' ? 'pending' : 'idle'}
                >
                  {dc.doubleCheck && 'Are you sure?'}
                  <Icon name={dc.doubleCheck ? 'check' : 'trash-2'} size="xs" />
                </StatusButton>
              </deleteFetcher.Form>
            )}
          </div>
        )}
      </div>

      {/* list --------------------------------------------------------- */}
      <SortableContext
        id={column.id}
        items={sortableItems}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 min-h-screen p-1 overflow-y-auto">
          {displayNotes.map((n) => {
            const isPreview = n.id.endsWith('-preview')
            const originalId = isPreview ? n.id.replace('-preview', '') : n.id

            if (isPreview) {
              return (
                <div
                  key={`preview-${originalId}`}
                  className="opacity-30 scale-95"
                >
                  <NoteCard note={{ ...n, id: originalId }} />
                </div>
              )
            }

            // Hide the original note if it's being dragged
            if (activeNote?.id === n.id) {
              return (
                <div
                  key={makeDragId(column.id, n.id)}
                  className="opacity-30"
                >
                  <SortableNote note={n} dragId={makeDragId(column.id, n.id)} />
                </div>
              )
            }

            return (
              <SortableNote
                key={makeDragId(column.id, n.id)}
                note={n}
                dragId={makeDragId(column.id, n.id)}
              />
            )
          })}
          {notes.length === 0 && !isDestination && (
            <div className="flex min-h-screen items-center justify-center h-20 text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/30 rounded">
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Note Card wrapper                                                         */
/* -------------------------------------------------------------------------- */

function SortableNote({ note, dragId }: { note: Note; dragId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: dragId,
    data: {
      type: 'Note',
      note
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-2xl scale-105' : ''} ${isOver ? 'ring-2 ring-primary/50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  “+ column” button – stateless (details element manages open/close)    */
/* -------------------------------------------------------------------------- */

function NewColumnButton({ orgSlug }: { orgSlug: string }) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col justify-start min-w-[260px]">
      {editing ? (
        <fetcher.Form
          method="post"
          action={`/app/${orgSlug}/notes/statuses`}
          onSubmit={() => (document.activeElement as HTMLElement)?.blur()}
          className="mt-2 flex gap-2"
        >
          <input type="hidden" name="intent" value="create-status" />
          <Input autoFocus name="name" placeholder="Column name" maxLength={24} onBlur={() => setEditing(false)} />
          <Button type="submit" variant="default" size="sm">
            Save
          </Button>
        </fetcher.Form>
      ) : (
        <Button type="button" variant="secondary" className="mt-2" onClick={() => setEditing(true)}>
          <Icon name="plus" className="mr-1" /> Add column
        </Button>
      )}


    </div>
  )
}