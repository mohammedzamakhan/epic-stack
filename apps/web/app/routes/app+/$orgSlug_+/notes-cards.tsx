import { formatDistanceToNow } from 'date-fns'
import { FileText, Copy, Image as ImageIcon, Check } from 'lucide-react'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar, AvatarFallback } from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { getNoteImgSrc } from '#app/utils/misc.tsx'

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
			className="w-full cursor-pointer group overflow-hidden py-0 hover:border-primary border-2 border-muted"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onClick={handleCardClick}
		>
			<CardContent className="p-0">
				{/* Image or Header Section */}
				<div className="relative aspect-video bg-blue-50 overflow-hidden">
					{firstImage ? (
						<>
							<Img
								src={getNoteImgSrc(firstImage.objectKey)}
								alt={firstImage.altText || 'Note image'}
								className="w-full h-full object-cover"
								width={400}
								height={225}
							/>
							{/* Overlay for better text visibility */}
							<div className="absolute inset-0" />
						</>
					) : (
						<div className="flex items-center justify-center h-full">
							<div className="bg-white/80 rounded-full p-4 shadow-sm">
								<FileText className="w-8 h-8 text-blue-600" />
							</div>
						</div>
					)}

					{/* Copy Button - Top Right */}
					<div
						className={`absolute top-3 right-3 transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
							}`}
					>
						<Button
							size="sm"
							variant="outline"
							onClick={handleCopyLink}
							className="bg-white/90 backdrop-blur-sm border-white/50 text-gray-700 text-xs h-8 px-3 shadow-sm"
						>
							{copied ? (
								<>
									<Check className="w-3 h-3 mr-1.5" />
									Copied
								</>
							) : (
								<>
									<Copy className="w-3 h-3 mr-1.5" />
									Copy
								</>
							)}
						</Button>
					</div>

					{/* Images Badge - Bottom Right */}
					{note.images.length > 0 && (
						<div className="absolute bottom-3 right-3">
							<Badge
								variant="outline"
								className="bg-white/90 backdrop-blur-sm border-white/50 text-gray-700 text-xs shadow-sm"
							>
								<ImageIcon className="w-3 h-3 mr-1" />
								{note.images.length}
							</Badge>
						</div>
					)}
				</div>

				{/* Content Section */}
				<div className="p-2 px-4">
					<div className="flex items-start gap-3">
						<div className="flex-1 min-w-0">
							<h4 className="text-gray-900 line-clamp-2 leading-tight">
								{note.title}
							</h4>
							<div className="text-xs mt-1">
								<h3 className="font-medium text-foreground inline">
									{createdBy}
								</h3>
								<span className="text-muted-foreground ml-2">
									• {timeAgo}
								</span>
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