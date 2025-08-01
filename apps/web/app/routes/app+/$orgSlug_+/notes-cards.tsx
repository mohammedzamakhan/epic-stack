import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar, AvatarFallback } from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { getNoteImgSrc } from '#app/utils/misc.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

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

interface NoteCardProps {
	note: Note
	isHovered?: boolean
}

const NoteCard = ({ note, isHovered = false }: NoteCardProps) => {
	const [hovered, setHovered] = useState(isHovered)
	const [copied, setCopied] = useState(false)
	const navigate = useNavigate()

	const timeAgo = formatDistanceToNow(new Date(note.updatedAt), {
		addSuffix: true,
	})

	const createdBy = note.createdByName || 'Unknown'
	const initials = createdBy
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()

	const handleCardClick = () => {
		void navigate(`${note.id}`)
	}

	const handleCopyLink = (e: React.MouseEvent) => {
		e.stopPropagation()
		const noteUrl = `${window.location.origin}${window.location.pathname}/${note.id}`
		navigator.clipboard.writeText(noteUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 1000)
	}

	// Get the first image for display
	const firstImage = note.images[0]

	return (
		<Card
			className="group hover:border-primary border-muted w-full cursor-pointer overflow-hidden border-2 py-0"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onClick={handleCardClick}
		>
			<CardContent className="p-0">
				{/* Image or Header Section */}
				<div className="relative aspect-video overflow-hidden bg-primary/20">
					{firstImage ? (
						<>
							<Img
								src={getNoteImgSrc(firstImage.objectKey)}
								alt={firstImage.altText || 'Note image'}
								className="h-full w-full object-cover"
								width={400}
								height={225}
							/>
							{/* Overlay for better text visibility */}
							<div className="absolute inset-0" />
						</>
					) : (
						<div className="flex h-full items-center justify-center">
							<div className="rounded-full bg-background/80 p-4 shadow-sm">
								<Icon name="file-text" className="h-8 w-8 text-primary" />
							</div>
						</div>
					)}

					{/* Copy Button - Top Right */}
					<div
						className={`absolute top-3 right-3 transition-all duration-300 ${
							hovered ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
						}`}
					>
						<Button
							size="sm"
							variant="secondary"
							onClick={handleCopyLink}
						>
							{copied ? (
								<>
									<Icon name="check" className="h-3 w-3" />
									Copied
								</>
							) : (
								<>
									<Icon name="copy" className="h-3 w-3" />
									Copy
								</>
							)}
						</Button>
					</div>

					{/* Images Badge - Bottom Right */}
					{note.images.length > 0 && (
						<div className="absolute right-3 bottom-3">
							<Badge
								variant="outline"
								className="border-white/50 bg-white/90 text-xs text-gray-700 shadow-sm backdrop-blur-sm"
							>
								<Icon name="image" className="mr-1 h-3 w-3" />
								{note.images.length}
							</Badge>
						</div>
					)}
				</div>

				{/* Content Section */}
				<div className="p-2 px-4">
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<h4 className="line-clamp-2 leading-tight">
								{note.title}
							</h4>
							<div className="mt-1 text-xs">
								<h3 className="text-foreground inline font-medium">
									{createdBy}
								</h3>
								<span className="text-muted-foreground ml-2">• {timeAgo}</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function NotesCards({ notes }: { notes: Note[] }) {
	if (notes.length === 0) {
		return null
	}

	return (
		<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
			{notes.map((note) => (
				<NoteCard key={note.id} note={note} />
			))}
		</div>
	)
}
