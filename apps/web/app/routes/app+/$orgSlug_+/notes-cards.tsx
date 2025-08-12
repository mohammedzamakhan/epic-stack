import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useRouteLoaderData, useFetcher } from 'react-router'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import { Portal } from '@radix-ui/react-portal'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { getNoteImgSrc, getUserImgSrc } from '#app/utils/misc.tsx'
import { loader } from './notes'

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

export type Note = {
	id: string
	title: string
	content: string
	createdAt: string
	updatedAt: string
	createdByName?: string
	createdBy?: {
		name?: string | null
		username?: string | null
		image?: { objectKey: string } | null
	}
	status?: string | null | { id: string; name: string }
	position?: number | null
	priority?: string | null
	tags?: string | null
	uploads: Array<{
		id: string
		type: string
		altText: string | null
		objectKey: string
		thumbnailKey: string | null
		status: string
	}>
}

interface NoteCardProps {
	note: Note
	isHovered?: boolean
	organizationId: string
	isEditing?: boolean
	setEditingNote?: (noteId: string | null) => void
}

export const NoteCard = ({
	note,
	organizationId,
	isEditing = false,
	setEditingNote,
}: NoteCardProps) => {
	const [copied, setCopied] = useState(false)
	const [editTitle, setEditTitle] = useState(note.title)
	const [editContent, setEditContent] = useState(
		note.content ? note.content.replace(/<[^>]*>/g, '') : '',
	)
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const loaderData = useRouteLoaderData<typeof loader>(
		'routes/app+/$orgSlug_+/notes',
	)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const isKanbanView = loaderData?.viewMode === 'kanban'

	const timeAgo = formatDistanceToNow(new Date(note.createdAt), {
		addSuffix: true,
	})

	const createdBy = note.createdByName || 'Unknown'
	const createdByInitials = createdBy
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()

	// Focus title input when editing starts
	useEffect(() => {
		if (isEditing && titleInputRef.current) {
			titleInputRef.current.focus()
			titleInputRef.current.select()
		}
	}, [isEditing])

	const handleCardClick = () => {
		if (!isEditing) {
			void navigate(`${note.id}`)
		}
	}

	const handleStartEdit = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (setEditingNote) {
			setEditingNote(note.id)
		}
	}

	const handleSaveEdit = () => {
		if (fetcher.state === 'idle') {
			const formData = new FormData()
			formData.append('actionType', 'inline-edit')
			formData.append('id', note.id)
			formData.append('title', editTitle)
			formData.append('content', editContent)

			fetcher.submit(formData, {
				method: 'POST',
				action: `/app/${loaderData?.organization.slug}/notes/${note.id}/edit`,
			})
		}
		if (setEditingNote) {
			setEditingNote(null)
		}
	}

	const handleCancelEdit = () => {
		setEditTitle(note.title)
		setEditContent(note.content ? note.content.replace(/<[^>]*>/g, '') : '')
		if (setEditingNote) {
			setEditingNote(null)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSaveEdit()
		} else if (e.key === 'Escape') {
			handleCancelEdit()
		}
	}

	const handleCopyLink = (e: React.MouseEvent) => {
		e.stopPropagation()
		const noteUrl = `${window.location.origin}${window.location.pathname}/${note.id}`
		void navigator.clipboard.writeText(noteUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 1000)
	}

	// Get the first media item for display (prioritize videos with thumbnails, then images)
	const firstVideo = note.uploads.find(
		(u) => u.type === 'video' && u.thumbnailKey && u.status === 'completed',
	)
	const firstImage = note.uploads.find((u) => u.type === 'image')
	const firstMedia = firstVideo || firstImage
	const isVideo = !!firstVideo

	// Parse tags from JSON string
	const tags = (() => {
		try {
			if (!note.tags) return []
			const parsed = JSON.parse(note.tags)
			if (Array.isArray(parsed)) {
				// Ensure all items are strings
				return parsed
					.map((tag) =>
						typeof tag === 'string'
							? tag
							: typeof tag === 'object' && tag?.name
								? tag.name
								: String(tag),
					)
					.filter(Boolean)
			}
			return []
		} catch {
			return []
		}
	})()

	return (
		<Card
			className="group flex h-full cursor-pointer flex-col overflow-hidden border py-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
			onClick={handleCardClick}
		>
			<CardContent className="flex h-full flex-col p-0">
				{/* Compact Media Header */}
				<div className="relative h-32 overflow-hidden">
					{firstMedia ? (
						<>
							<Img
								src={
									isVideo && firstVideo?.thumbnailKey
										? getNoteImgSrc(firstVideo.thumbnailKey, organizationId)
										: firstImage
											? getNoteImgSrc(firstImage.objectKey, organizationId)
											: ''
								}
								alt={
									firstMedia.altText ||
									(isVideo ? 'Video thumbnail' : 'Note image')
								}
								className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
								width={350}
								height={128}
							/>

							{/* Minimal video play overlay */}
							{isVideo && (
								<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									<div className="rounded-full bg-black/20 p-2 backdrop-blur-sm">
										<Icon name="arrow-right" className="h-4 w-4 text-white" />
									</div>
								</div>
							)}

							{/* Gradient overlay for better text readability */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
						</>
					) : (
						<div className="from-primary/5 to-primary/10 flex h-full items-center justify-center bg-gradient-to-br">
							<Icon name="file-text" className="text-primary/40 h-6 w-6" />
						</div>
					)}

					{/* Status and Priority indicators - Top Left */}
					{!isKanbanView && (
						<div className="absolute top-2 left-2 flex items-center gap-1">
							{/* Status indicator */}
							{note.status && (
								<div className="bg-muted flex items-center gap-1.5 rounded-full border border-white/20 px-2 py-1 shadow-sm backdrop-blur-sm">
									{(() => {
										const status =
											typeof note.status === 'string'
												? { name: note.status, color: '#6b7280' }
												: (note.status as { name: string; color?: string })
										const color = status.color || '#6b7280'
										return (
											<div
												className="h-1.5 w-1.5 rounded-full"
												style={{ backgroundColor: color }}
											/>
										)
									})()}
									<span className="text-muted-foreground text-xs font-medium">
										{(() => {
											const statusName =
												typeof note.status === 'string'
													? note.status
													: (note.status as { name: string })?.name
											return statusName ? statusName.replace('-', ' ') : ''
										})()}
									</span>
								</div>
							)}
						</div>
					)}

					{/* Floating action buttons - only show on hover */}
					<div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-all duration-300 group-hover:opacity-100">
						{setEditingNote && (
							<Button
								size="sm"
								variant="secondary"
								onClick={handleStartEdit}
								aria-label="Edit note"
							>
								<Icon name="pencil" className="h-3 w-3" />
							</Button>
						)}
						<Button size="sm" variant="secondary" onClick={handleCopyLink}>
							{copied ? (
								<Icon name="check" className="h-3 w-3" />
							) : (
								<Icon name="copy" className="h-3 w-3" />
							)}
						</Button>
					</div>

					{/* Minimal media count indicators */}
					{note.uploads.length > 0 && (
						<div className="absolute bottom-2 left-2 flex gap-1">
							{note.uploads.filter((u) => u.type === 'image').length > 0 && (
								<div className="flex items-center gap-1 rounded bg-black/20 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
									<Icon name="image" className="h-2.5 w-2.5" />
									<span>
										{note.uploads.filter((u) => u.type === 'image').length}
									</span>
								</div>
							)}
							{note.uploads.filter((u) => u.type === 'video').length > 0 && (
								<div className="flex items-center gap-1 rounded bg-black/20 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
									<Icon name="camera" className="h-2.5 w-2.5" />
									<span>
										{note.uploads.filter((u) => u.type === 'video').length}
									</span>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Content Section - Flex container */}
				<div className="flex flex-1 flex-col">
					{/* Main content area */}
					<div className="flex-1 space-y-2 p-4 py-2">
						{/* Title and Content */}
						{isEditing ? (
							<div className="space-y-2">
								<div className="flex gap-2">
									<Input
										ref={titleInputRef}
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value)}
										onKeyDown={handleKeyDown}
										className="h-8 flex-1 px-2 font-medium"
										placeholder="Note title..."
									/>
									<div className="flex gap-1">
										<Button
											size="sm"
											onClick={handleSaveEdit}
											className="h-8 w-8 p-0"
											aria-label="Save changes"
											disabled={fetcher.state !== 'idle'}
										>
											<Icon name="check" className="h-3 w-3" />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={handleCancelEdit}
											className="h-8 w-8 p-0"
											aria-label="Cancel editing"
										>
											<Icon name="x" className="h-3 w-3" />
										</Button>
									</div>
								</div>
								<Textarea
									value={editContent}
									onChange={(e) => setEditContent(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Note content..."
									className="min-h-16 resize-none text-sm"
									rows={2}
								/>
							</div>
						) : (
							<div className="space-y-0">
								<div className="flex items-center gap-2">
									{/* Priority indicator button */}
									{note.priority && (
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="sm"
													variant="secondary"
													className="h-6 w-6 p-0"
													onClick={(e) => e.stopPropagation()}
												>
													{(() => {
														switch (note.priority) {
															case 'urgent':
																return (
																	<Icon
																		name="octagon-alert"
																		className="h-4 w-4 text-red-600"
																	/>
																)
															case 'high':
																return (
																	<Icon
																		name="signal-high"
																		className="h-4 w-4 text-red-500"
																	/>
																)
															case 'medium':
																return (
																	<Icon
																		name="signal-medium"
																		className="h-4 w-4 text-yellow-500"
																	/>
																)
															case 'low':
																return (
																	<Icon
																		name="signal-low"
																		className="h-4 w-4 text-green-500"
																	/>
																)
															default:
																return (
																	<Icon
																		name="minus"
																		className="h-4 w-4 text-gray-400"
																	/>
																)
														}
													})()}
												</Button>
											</TooltipTrigger>
											<Portal>
												<TooltipContent>
													<p className="capitalize">{note.priority} priority</p>
												</TooltipContent>
											</Portal>
										</Tooltip>
									)}
									<h4 className="text-foreground group-hover:text-primary line-clamp-2 flex-1 text-sm leading-tight transition-colors duration-200">
										{note.title}
									</h4>
								</div>
								<p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
									{note.content
										? note.content.replace(/<[^>]*>/g, '').substring(0, 100)
										: 'No content'}
									{note.content &&
										note.content.replace(/<[^>]*>/g, '').length > 100 &&
										'...'}
								</p>
							</div>
						)}

						{/* Minimal tags */}
						{tags && tags.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{tags.slice(0, 3).map((tag: any, index: number) => (
									<span
										key={index}
										className="bg-primary/8 text-primary inline-flex items-center rounded-md px-2 py-0.5 text-xs"
									>
										{typeof tag === 'string' ? tag : tag?.name || String(tag)}
									</span>
								))}
								{tags.length > 3 && (
									<span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
										+{tags.length - 3}
									</span>
								)}
							</div>
						)}
					</div>

					<div className="mt-auto border-t font-mono">
						<div className="flex items-center justify-between px-4 py-2">
							<div className="flex items-center gap-2">
								<Avatar className="h-5 w-5">
									<AvatarImage
										src={
											note.createdBy?.image?.objectKey
												? getUserImgSrc(note.createdBy.image.objectKey)
												: undefined
										}
										alt={createdBy}
									/>
									<AvatarFallback className="text-xs font-medium">
										{createdByInitials}
									</AvatarFallback>
								</Avatar>
								<span className="text-muted-foreground text-xs font-medium">
									{createdBy.split(' ')[0]}
								</span>
							</div>

							<span className="text-muted-foreground text-xs tracking-tighter">
								{timeAgo}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function NotesCards({
	notes,
	organizationId,
}: {
	notes: LoaderNote[]
	organizationId: string
}) {
	const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

	if (notes.length === 0) {
		return null
	}

	return (
		<div className="grid gap-6 p-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
			{notes.map((note) => (
				<NoteCard
					key={note.id}
					note={note}
					organizationId={organizationId}
					isEditing={editingNoteId === note.id}
					setEditingNote={setEditingNoteId}
				/>
			))}
		</div>
	)
}
