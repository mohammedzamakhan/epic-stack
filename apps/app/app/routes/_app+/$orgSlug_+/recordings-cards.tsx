import { getUserImgSrc } from '@repo/common'
import { cn } from '@repo/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Frame, FramePanel, FrameFooter } from '@repo/ui/frame'
import { Icon } from '@repo/ui/icon'
import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

export type Recording = {
	id: string
	title: string
	description?: string | null
	status: string
	priority?: string | null
	tags?: string | null
	createdAt: string
	updatedAt: string
	createdById: string
	videoObjectKey?: string | null
	videoThumbnailKey?: string | null
	videoDuration?: number | null
	createdBy?: {
		name?: string | null
		username?: string | null
		image?: { objectKey: string } | null
	}
}

interface RecordingCardProps {
	recording: Recording
	_organizationId: string
	_projectId: string
}

export const RecordingCard = ({
	recording,
	_organizationId,
	_projectId,
}: RecordingCardProps) => {
	const [copied, setCopied] = useState(false)
	const navigate = useNavigate()

	const updatedAgo = formatDistanceToNow(new Date(recording.updatedAt), {
		addSuffix: false,
	})

	const createdBy =
		recording.createdBy?.name || recording.createdBy?.username || 'Unknown'
	const createdByInitials = createdBy
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()

	const handleCardClick = () => {
		void navigate(`recordings/${recording.id}`)
	}

	const handleCopyLink = async (e: React.MouseEvent) => {
		e.stopPropagation()
		try {
			const url = `${window.location.origin}${window.location.pathname}/recordings/${recording.id}`
			await navigator.clipboard.writeText(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy link:', error)
		}
	}

	const formatDuration = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'processing':
				return 'bg-yellow-500'
			case 'completed':
				return 'bg-green-500'
			case 'failed':
				return 'bg-red-500'
			default:
				return 'bg-gray-400'
		}
	}

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'processing':
				return 'Processing'
			case 'completed':
				return 'Active'
			case 'failed':
				return 'Failed'
			default:
				return status
		}
	}

	return (
		<Frame
			className="group hover:bg-muted/70 cursor-pointer transition-all duration-200"
			onClick={handleCardClick}
		>
			<FramePanel className="flex flex-col gap-3 p-3">
				{/* Thumbnail */}
				<div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
					{recording.videoThumbnailKey ? (
						<Img
							src={`/resources/images?objectKey=${recording.videoThumbnailKey}`}
							alt={recording.title}
							className="h-full w-full object-cover"
							width={400}
							height={250}
						/>
					) : (
						<div className="flex h-full items-center justify-center">
							<Icon
								name="camera"
								className="h-10 w-10 text-blue-300 dark:text-blue-600"
							/>
						</div>
					)}

					{/* Duration badge */}
					{recording.videoDuration && (
						<div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
							{formatDuration(recording.videoDuration)}
						</div>
					)}

					{/* Menu button */}
					<div className="absolute top-2 right-2">
						<DropdownMenu>
							<DropdownMenuTrigger
								className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-gray-600 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white dark:bg-black/50 dark:text-gray-300 dark:hover:bg-black/70"
								onClick={(e) => e.stopPropagation()}
							>
								<Icon name="ellipsis-vertical" className="h-4 w-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								onClick={(e) => e.stopPropagation()}
							>
								<DropdownMenuItem onClick={handleCopyLink}>
									<Icon
										name={copied ? 'check' : 'copy'}
										className="mr-2 h-4 w-4"
									/>
									{copied ? 'Copied!' : 'Copy link'}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Content */}
				<div className="flex flex-col gap-1.5 px-1">
					{/* Status and avatar row */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Avatar className="border-background h-5 w-5 border shadow-sm">
								<AvatarImage
									src={
										recording.createdBy?.image
											? getUserImgSrc(recording.createdBy.image.objectKey)
											: undefined
									}
									alt={createdBy}
								/>
								<AvatarFallback className="text-[9px] font-medium">
									{createdByInitials}
								</AvatarFallback>
							</Avatar>
							<span className="text-muted-foreground text-xs">
								{createdBy.split(' ')[0]}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<div
								className={cn(
									'h-1.5 w-1.5 rounded-full',
									getStatusColor(recording.status),
								)}
							/>
							<span className="text-muted-foreground text-xs">
								{getStatusLabel(recording.status)}
							</span>
						</div>
					</div>

					{/* Title */}
					<h3 className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
						{recording.title}
					</h3>
				</div>
			</FramePanel>

			{/* Animated Footer */}
			<FrameFooter className="relative h-10 overflow-hidden py-2">
				{/* Default: Updated time - slides out to the left */}
				<div className="text-muted-foreground absolute inset-x-5 inset-y-0 flex items-center text-xs transition-all duration-200 ease-out group-hover:-translate-x-full group-hover:opacity-0">
					Updated {updatedAgo} ago
				</div>
				{/* Hover: Go to recording - slides in from the right */}
				<div className="text-primary absolute inset-y-0 right-5 flex translate-x-full items-center text-xs font-medium opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100">
					Go to recording
					<Icon name="arrow-right" className="ml-1 h-3 w-3" />
				</div>
			</FrameFooter>
		</Frame>
	)
}

interface RecordingsCardsProps {
	recordings: Recording[]
	organizationId: string
	_projectId: string
}

export const RecordingsCards = ({
	recordings,
	organizationId,
	_projectId,
}: RecordingsCardsProps) => {
	return (
		<div className="grid gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{recordings.map((recording) => (
				<RecordingCard
					key={recording.id}
					recording={recording}
					_organizationId={organizationId}
					_projectId={_projectId}
				/>
			))}
		</div>
	)
}
