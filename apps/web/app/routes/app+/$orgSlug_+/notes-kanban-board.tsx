import { useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { useFetcher, useFetchers } from 'react-router'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '#app/components/ui/button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
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
    return { columnId, noteId }
  }
  return { columnId: id }
}

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
    } as LoaderNote))

  // Pending status creates / renames
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

  // Build columns
  const columns: Column[] = [
    ...statuses.map(s => ({
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )
  const reorderFetcher = useFetcher()
  const activeNoteRef = useRef<Note | null>(null)

  function handleDragStart(ev: any) {
    const info = parseDragId(ev.active.id)
    if (info?.noteId) {
      activeNoteRef.current = noteMap.get(info.noteId) ?? null
    } else {
      activeNoteRef.current = null
    }
  }

  function handleDragEnd(ev: any) {
    const { active, over } = ev
    activeNoteRef.current = null
    if (!over) return

    const activeInfo = parseDragId(active.id)
    const overInfo = parseDragId(over.id)
    const destColId = overInfo?.columnId ?? String(over.id)
    if (!destColId || !activeInfo?.noteId) return
    const list = grouped[destColId] ?? []
    let destIndex = list.length

    if (overInfo?.noteId) {
      const overIndex = list.findIndex(n => n.id === overInfo.noteId)
      if (overIndex >= 0) destIndex = overIndex

      // If moving within same column and after itself, adjust index
      if (
        activeInfo.columnId === destColId &&
        overIndex > list.findIndex(n => n.id === activeInfo.noteId)
      ) {
        destIndex--
      }
    }

    const formData = new FormData()
    formData.append('intent', 'reorder-note')
    formData.append('noteId', activeInfo.noteId)
    formData.append('position', String(destIndex))
    if (destColId !== UNCATEGORISED) formData.append('statusId', destColId)
    reorderFetcher.submit(formData, { method: 'post', action: `/app/${orgSlug}/notes/reorder` })
  }

  // --- Render ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => (activeNoteRef.current = null)}
    >
      <div className="flex gap-6 overflow-x-auto py-2">
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            notes={grouped[col.id]}
            orgSlug={orgSlug}
          />
        ))}
        <NewColumnButton orgSlug={orgSlug} />
      </div>
      <DragOverlay>
        {activeNoteRef.current ? <NoteCard note={activeNoteRef.current} /> : null}
      </DragOverlay>
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
}: {
  column: Column
  notes: Note[]
  orgSlug: string
}) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const renameFetcher = useFetcher()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div ref={setNodeRef} className="flex flex-col min-w-[320px] bg-muted/60 rounded-lg p-3 shadow-sm">
      {/* header ------------------------------------------------------- */}
      <div className="font-semibold mb-3 flex items-center gap-2 group">
        {editing ? (
          <renameFetcher.Form
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
              className="w-32 h-7"
              onKeyDown={e => e.key === 'Escape' && setEditing(false)}
            />
          </renameFetcher.Form>
        ) : (
          <>
            <span>{column.name}</span>
            {column.id !== UNCATEGORISED && (
              <button
                onClick={() => setEditing(true)}
                className="invisible group-hover:visible ml-1 p-1 hover:bg-muted-foreground/10 rounded-sm"
              >
                <Icon name="pencil" size="xs" />
              </button>
            )}
          </>
        )}
      </div>

      {/* list --------------------------------------------------------- */}
      <SortableContext
        id={column.id}
        items={notes.map(n => makeDragId(column.id, n.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-3 min-h-[100px]">
          {notes.map(n => (
            <SortableNote key={makeDragId(column.id, n.id)} note={n} dragId={makeDragId(column.id, n.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Note Card wrapper                                                         */
/* -------------------------------------------------------------------------- */

function SortableNote({ note, dragId }: { note: Note; dragId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dragId })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
        cursor: 'grab',
      }}
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

  return (
    <details className="flex flex-col justify-start min-w-[260px]">
      <summary>
        <Button variant="secondary" className="mt-2">
          <Icon name="plus" className="mr-1" /> Add column
        </Button>
      </summary>

      <fetcher.Form
        method="post"
        action={`/app/${orgSlug}/notes/statuses`}
        onSubmit={() => (document.activeElement as HTMLElement)?.blur()}
        className="mt-2 flex gap-2"
      >
        <input type="hidden" name="intent" value="create-status" />
        <Input autoFocus name="name" placeholder="Column name" maxLength={24} />
        <Button type="submit" variant="primary" size="sm">
          Save
        </Button>
      </fetcher.Form>
    </details>
  )
}