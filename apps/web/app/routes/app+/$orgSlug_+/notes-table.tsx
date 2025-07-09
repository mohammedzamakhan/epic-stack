import { getFormProps, useForm } from '@conform-to/react'
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
import { Form } from 'react-router'
import { z } from 'zod'
import { floatingToolbarClassName } from '#app/components/floating-toolbar.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#app/components/ui/sheet.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader,
  TableRow 
} from '#app/components/ui/table.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { OrgNoteEditor } from './__org-note-editor.tsx'

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

const DeleteFormSchema = z.object({
  intent: z.literal('delete-note'),
  noteId: z.string(),
})

export function NotesTable({ notes }: { notes: Note[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const columns: ColumnDef<Note>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.getValue('title')}</div>
        )
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
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click handler
                setSelectedNote(note)
                setSheetOpen(true)
              }}
            >
              <Icon name="clock" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click handler
                setSelectedNote(note);
                setEditMode(true);
                setSheetOpen(true);
              }}
            >
              <Icon name="pencil-1" className="size-4" />
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
    setSelectedNote(note)
    setSheetOpen(true)
  }

  function handleEditClick() {
    if (selectedNote) {
      setEditMode(true)
    }
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
      
      {selectedNote && (
        <Sheet 
          open={sheetOpen} 
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setEditMode(false);
          }}
        >
          <SheetContent className="w-[90vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-auto p-0">
            {editMode ? (
              <>
                <SheetHeader className="p-6 pb-2 border-b">
                  <SheetTitle className="text-xl font-semibold">Edit Note</SheetTitle>
                </SheetHeader>
                <div className="px-1">
                  <OrgNoteEditor 
                    note={selectedNote} 
                    onSuccess={() => {
                      setSheetOpen(false);
                      setEditMode(false);
                    }} 
                  />
                </div>
              </>
            ) : (
              <>
                <SheetHeader className="p-6 pb-2 border-b">
                  <SheetTitle className="text-xl font-semibold">{selectedNote.title}</SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    {formatDistanceToNow(new Date(selectedNote.updatedAt), { addSuffix: true })}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="p-6 pt-4 overflow-y-auto max-h-[calc(80vh-120px)]">
                  {selectedNote.images.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-6">
                      {selectedNote.images.map((image) => (
                        <img 
                          key={image.id}
                          src={`/resources/note-images/${image.objectKey}`}
                          alt={image.altText || ''}
                          className="size-36 rounded-lg object-cover shadow-sm hover:shadow transition-shadow"
                        />
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap prose prose-sm max-w-none">
                    {selectedNote.content}
                  </div>
                </div>

                <SheetFooter className={`${floatingToolbarClassName} bg-background border-t px-6 py-4`}>
                  <div className="flex items-center justify-between gap-2 w-full">
                    <DeleteNote id={selectedNote.id} onDelete={() => setSheetOpen(false)} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSheetOpen(false)}>
                        Close
                      </Button>
                      <Button onClick={handleEditClick}>
                        <Icon name="pencil-1">Edit</Icon>
                      </Button>
                    </div>
                  </div>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

function DeleteNote({ id, onDelete }: { id: string; onDelete: () => void }) {
  const isPending = useIsPending()
  const [form] = useForm({
    id: 'delete-note',
  })

  return (
    <Form method="POST" {...getFormProps(form)}>
      <input type="hidden" name="noteId" value={id} />
      <StatusButton
        type="submit"
        name="intent"
        value="delete-note"
        variant="destructive"
        status={isPending ? 'pending' : (form.status ?? 'idle')}
        disabled={isPending}
        onClick={(e) => {
          // Prevent the row click handler from firing
          e.stopPropagation()
          if (onDelete) {
            onDelete()
          }
        }}
      >
        <Icon name="trash">Delete</Icon>
      </StatusButton>
      <ErrorList errors={form.errors} id={form.errorId} />
    </Form>
  )
}
