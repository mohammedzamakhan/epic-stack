import { Portal } from '@radix-ui/react-portal'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useRouteLoaderData, useFetcher } from 'react-router'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { PrioritySignal } from '#app/components/ui/priority-signal.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { cn, getNoteImgSrc, getUserImgSrc } from '#app/utils/misc.tsx'
import { type loader } from './notes'

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
	const [tooltipOpen, setTooltipOpen] = useState(false)
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

			void fetcher.submit(formData, {
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
		setTooltipOpen(true)
		setTimeout(() => {
			setCopied(false)
			setTooltipOpen(false)
		}, 2000)
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
			type Tag = string | { name: string }
			if (Array.isArray(parsed)) {
				// Ensure all items are strings
				return (parsed as Tag[])
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
		<div className="group h-full">
			<Card
				className="group-hover:bg-muted/30 relative h-full cursor-pointer overflow-hidden rounded-3xl border-none py-0 shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)] transition-all dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_0_rgba(0,0,0,0.1),0_4px_4px_0_rgba(0,0,0,0.1),0_8px_8px_0_rgba(0,0,0,0.1)]"
				onClick={handleCardClick}
			>
				{/* Background gradient overlay */}
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30 transition-opacity duration-500 ease-out group-hover:opacity-40" />

				<CardContent className="relative flex h-full flex-col px-2 pt-2 pb-3">
					{/* Enhanced Media Header */}
					{!isKanbanView && (
						<div className="relative mb-2 h-[160px] w-full rounded-[16px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_0_rgba(0,0,0,0.1),0_4px_4px_0_rgba(0,0,0,0.1),0_8px_8px_0_rgba(0,0,0,0.1)]">
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
										className="absolute inset-0 h-full w-full rounded-[16px] object-cover transition-all duration-300"
										width={200}
										height={200}
									/>

									{/* Enhanced overlay structure */}
									<div className="absolute inset-0 rounded-[16px]">
										<div className="absolute inset-0 rounded-[16px] shadow-[0px_0px_0px_1px_rgba(0,0,0,.07),0px_0px_0px_3px_#fff,0px_0px_0px_4px_rgba(0,0,0,.08)] dark:shadow-[0px_0px_0px_1px_rgba(0,0,0,.07),0px_0px_0px_3px_rgba(100,100,100,0.3),0px_0px_0px_4px_rgba(0,0,0,.08)]" />
										<div className="absolute inset-0 rounded-[16px] dark:shadow-[0px_1px_1px_0px_rgba(0,0,0,0.15),0px_1px_1px_0px_rgba(0,0,0,0.15)_inset,0px_0px_0px_1px_rgba(0,0,0,0.15)_inset,0px_0px_1px_0px_rgba(0,0,0,0.15)]" />
									</div>

									{/* Video play overlay */}
									{isVideo && (
										<div className="absolute inset-0 flex items-center justify-center rounded-[16px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
											<div className="rounded-full bg-black/20 p-3 backdrop-blur-sm">
												<Icon
													name="arrow-right"
													className="h-5 w-5 text-white"
												/>
											</div>
										</div>
									)}
								</>
							) : (
								<div className="from-primary/5 to-primary/10 flex h-full items-center justify-center rounded-[16px] bg-gradient-to-br">
									<Icon name="file-text" className="text-primary/40 h-8 w-8" />
								</div>
							)}

							{/* Card action buttons - styled like attachment count */}
							<div className="absolute -top-[1px] -right-[1px] z-10 flex transition-all duration-300">
								{setEditingNote && (
									<div className="pointer-events-auto">
										<Tooltip delayDuration={0}>
											<TooltipTrigger asChild>
												<button
													className="bg-background text-background-foreground flex items-center gap-1.5 rounded-bl-md border-b border-l border-black/10 px-2 py-1.5"
													onClick={handleStartEdit}
												>
													<Icon name="pencil" className="h-3.5 w-3.5" />
												</button>
											</TooltipTrigger>
											<Portal>
												<TooltipContent>
													<p>Quick edit</p>
												</TooltipContent>
											</Portal>
										</Tooltip>
									</div>
								)}
								<div className="pointer-events-auto">
									<Tooltip
										delayDuration={0}
										open={tooltipOpen}
										onOpenChange={setTooltipOpen}
									>
										<TooltipTrigger asChild>
											<button
												className="bg-background text-background-foreground flex items-center gap-1.5 rounded-tr-[16px] border-b border-l border-black/10 px-2 py-1.5"
												onClick={handleCopyLink}
											>
												{copied ? (
													<Icon name="check" className="h-3.5 w-3.5" />
												) : (
													<Icon name="copy" className="h-3.5 w-3.5" />
												)}
											</button>
										</TooltipTrigger>
										<Portal>
											<TooltipContent>
												<p>{copied ? 'Link copied!' : 'Copy link'}</p>
											</TooltipContent>
										</Portal>
									</Tooltip>
								</div>
							</div>

							{/* Status indicator - positioned over image */}
							{!isKanbanView && note.status && (
								<div className="pointer-events-none absolute top-[-1px] left-[-1px] z-10">
									<div className="bg-background flex items-center gap-1.5 rounded-tl-xl rounded-br border-r border-b border-black/10 px-2 py-1">
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
										<span className="text-background-foreground text-xs font-medium">
											{(() => {
												const statusName =
													typeof note.status === 'string'
														? note.status
														: (note.status as { name: string })?.name
												return statusName ? statusName.replace('-', ' ') : ''
											})()}
										</span>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Title and Content Section */}
					{isEditing ? (
						<div className="space-y-2 px-1">
							<div className="flex gap-1">
								<Input
									ref={titleInputRef}
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									onKeyDown={handleKeyDown}
									className="h-8 flex-1 px-2 font-semibold"
									placeholder="Note title..."
								/>
								<div className="flex items-center gap-1">
									<Button
										size="icon"
										onClick={handleSaveEdit}
										className="h-6 w-6 p-0"
										aria-label="Save changes"
										disabled={fetcher.state !== 'idle'}
									>
										<Icon name="check" className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="destructive"
										onClick={handleCancelEdit}
										className="h-6 w-6 p-0"
										aria-label="Cancel editing"
									>
										<Icon name="x" className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<Textarea
								value={editContent}
								onChange={(e) => setEditContent(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Note content..."
								className="max-h-20 min-h-16 resize-none text-sm"
								rows={2}
							/>
						</div>
					) : (
						<div className={cn('px-2', isKanbanView && 'pt-1')}>
							<div className="flex items-start justify-between">
								{/* Priority indicator */}
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
																	className="text-muted-foreground h-4 w-4 stroke-3"
																/>
															)
														case 'high':
															return (
																<PrioritySignal
																	priority="high"
																	className="h-4 w-4"
																/>
															)
														case 'medium':
															return (
																<PrioritySignal
																	priority="medium"
																	className="h-4 w-4"
																/>
															)
														case 'low':
															return (
																<PrioritySignal
																	priority="low"
																	className="h-4 w-4"
																/>
															)
														default:
															return (
																<Icon
																	name="minus"
																	className="text-muted-foreground h-4 w-4 stroke-3"
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
								<h3 className="flex-1 text-lg leading-tight font-semibold">
									{note.title}
								</h3>
							</div>
							{/* Content preview */}
							{note.content && (
								<p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
									{note.content.replace(/<[^>]*>/g, '').substring(0, 120)}
									{note.content.replace(/<[^>]*>/g, '').length > 120 && '...'}
								</p>
							)}
						</div>
					)}

					{/* Tags section */}
					{tags && tags.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-1 px-1">
							{tags.slice(0, 2).map((tag: string, index: number) => (
								<span
									key={index}
									className="bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
								>
									{tag}
								</span>
							))}
							{tags.length > 2 && (
								<span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
									+{tags.length - 2}
								</span>
							)}
						</div>
					)}

					{/* Footer */}
					<div className="mt-auto px-1 pt-2 font-mono">
						<div className="flex items-center justify-between">
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
				</CardContent>
			</Card>
		</div>
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
