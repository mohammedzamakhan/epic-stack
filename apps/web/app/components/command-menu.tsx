import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useRouteLoaderData } from 'react-router'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '#app/components/ui/command'
import { Icon } from '#app/components/ui/icon'
import { type loader as rootLoader } from '#app/root.tsx'

interface Note {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
    createdByName: string
}

interface CommandMenuProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(false)
    const [query, setQuery] = useState('')
    const navigate = useNavigate()
    const rootData = useRouteLoaderData<typeof rootLoader>('root')

    const orgSlug = rootData?.userOrganizations?.currentOrganization?.organization.slug

    // Reset state when dialog closes
    // useEffect(() => {
    //     if (!open) {
    //         setQuery('')
    //         setNotes([])
    //         setLoading(false)
    //     }
    // }, [open])

    const searchNotes = useCallback(async (searchQuery: string) => {
        if (!orgSlug) return

        setLoading(true)
        try {
            const params = new URLSearchParams({
                orgSlug,
                ...(searchQuery && { q: searchQuery }),
            })
            const response = await fetch(`/resources/search-notes?${params}`)
            if (response.ok) {
                const data = await response.json() as { notes: Note[] }
                setNotes(data.notes)
            }
        } catch (error) {
            console.error('Failed to search notes:', error)
            setNotes([])
        } finally {
            setLoading(false)
        }
    }, [orgSlug])

    // Debounce search
    useEffect(() => {
        if (!open) return

        const timeoutId = setTimeout(() => {
            searchNotes(query)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [open, query, searchNotes])

    const handleSelectNote = (noteId: string) => {
        if (orgSlug) {
            navigate(`/app/${orgSlug}/notes/${noteId}`)
            onOpenChange(false)
        }
    }

    const handleCreateNote = () => {
        if (orgSlug) {
            navigate(`/app/${orgSlug}/notes/new`)
            onOpenChange(false)
        }
    }

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} className="rounded-lg border shadow-md md:min-w-[650px]">
            <CommandInput
                placeholder="Search notes..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList className="md:min-h-[400px]">
                <CommandEmpty>
                    {loading ? 'Loading notes...' : 'No notes found.'}
                </CommandEmpty>

                <CommandGroup heading="Actions">
                    <CommandItem onSelect={handleCreateNote}>
                        <Icon name="plus" />
                        Create new note
                    </CommandItem>
                </CommandGroup>

                {notes.length > 0 && (
                    <CommandGroup heading="Notes">
                        {notes.map((note) => (
                            <CommandItem
                                key={note.id}
                                onSelect={() => handleSelectNote(note.id)}
                            >
                                <Icon name="file-text" />
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{note.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                        by {note.createdByName}
                                    </span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                )}
                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => {
                        navigate('/settings/general')
                        onOpenChange(false)
                    }}>
                        <Icon name="person" />
                        <span>Account settings</span>
                        <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => {
                        if (orgSlug) {
                            navigate(`/app/${orgSlug}/settings/billing`)
                            onOpenChange(false)
                        }
                    }}>
                        <Icon name="credit-card" />
                        <span>Billing</span>
                        <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => {
                        if (orgSlug) {
                            navigate(`/app/${orgSlug}/settings`)
                            onOpenChange(false)
                        }
                    }}>
                        <Icon name="gear" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}