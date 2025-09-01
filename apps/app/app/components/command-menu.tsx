import { useEffect, useState, useCallback } from 'react'
import { useRouteLoaderData, useFetcher, Link } from 'react-router'
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
	Icon,
} from '@repo/ui'
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
	const [hasTrackedUsage, setHasTrackedUsage] = useState(false)
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const fetcher = useFetcher()

	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug
	const organizationId =
		rootData?.userOrganizations?.currentOrganization?.organization.id

	// Track command menu usage for onboarding (only once per session)
	useEffect(() => {
		if (open && !hasTrackedUsage && organizationId) {
			setHasTrackedUsage(true)
			void fetcher.submit(
				{ stepKey: 'explore_command_menu', organizationId },
				{ method: 'POST', action: '/api/onboarding/complete-step' },
			)
		}
	}, [open, hasTrackedUsage, organizationId, fetcher])

	const searchNotes = useCallback(
		async (searchQuery: string) => {
			if (!orgSlug) return

			setLoading(true)
			try {
				const params = new URLSearchParams({
					orgSlug,
					...(searchQuery && { q: searchQuery }),
				})
				const response = await fetch(`/resources/search-notes?${params}`)
				if (response.ok) {
					const data = (await response.json()) as { notes: Note[] }
					setNotes(data.notes)
				}
			} catch (error) {
				console.error('Failed to search notes:', error)
				setNotes([])
			} finally {
				setLoading(false)
			}
		},
		[orgSlug],
	)

	// Debounce search
	useEffect(() => {
		if (!open) return

		const timeoutId = setTimeout(() => {
			void searchNotes(query)
		}, 300)

		return () => clearTimeout(timeoutId)
	}, [open, query, searchNotes])

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			className="rounded-lg border shadow-md md:min-w-[650px]"
		>
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
					<CommandItem asChild>
						<Link
							to={`/app/${orgSlug}/notes/new`}
							onClick={() => onOpenChange(false)}
						>
							<Icon name="plus" />
							Create new note
						</Link>
					</CommandItem>
					<CommandItem asChild>
						<Link
							to={`/app/${orgSlug}/settings/members`}
							onClick={() => onOpenChange(false)}
						>
							<Icon name="user-plus" />
							Invite new members
						</Link>
					</CommandItem>
				</CommandGroup>

				{notes.length > 0 && (
					<CommandGroup heading="Notes">
						{notes.map((note) => (
							<CommandItem key={note.id} asChild>
								<Link
									to={`/app/${orgSlug}/notes/${note.id}`}
									onClick={() => onOpenChange(false)}
								>
									<Icon name="file-text" />
									<div className="flex flex-col items-start">
										<span className="font-medium">{note.title}</span>
										<span className="text-muted-foreground text-xs">
											by {note.createdByName}
										</span>
									</div>
								</Link>
							</CommandItem>
						))}
					</CommandGroup>
				)}
				<CommandGroup heading="Settings">
					<CommandItem asChild>
						<Link to="/app/profile" onClick={() => onOpenChange(false)}>
							<Icon name="user" />
							<span>Account settings</span>
							<CommandShortcut>⌘P</CommandShortcut>
						</Link>
					</CommandItem>
					<CommandItem asChild>
						<Link
							to={`/app/${orgSlug}/settings/billing`}
							onClick={() => onOpenChange(false)}
						>
							<Icon name="credit-card" />
							<span>Billing</span>
							<CommandShortcut>⌘B</CommandShortcut>
						</Link>
					</CommandItem>
					<CommandItem asChild>
						<Link
							to={`/app/${orgSlug}/settings`}
							onClick={() => onOpenChange(false)}
						>
							<Icon name="settings" />
							<span>Settings</span>
							<CommandShortcut>⌘S</CommandShortcut>
						</Link>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	)
}
