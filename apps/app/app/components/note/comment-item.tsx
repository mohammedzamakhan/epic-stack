import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { getNoteImgSrc, getUserImgSrc } from '#app/utils/misc'

import CommentInput, { type MentionUser } from './comment-input'
import { Avatar, AvatarFallback, AvatarImage, Button, Icon } from '@repo/ui'

interface CommentUser {
	id: string
	name: string | null
	username: string
	image?: { objectKey: string } | null
}

interface Comment {
	id: string
	content: string
	createdAt: string
	user: CommentUser
	replies: Comment[]
	images?: Array<{
		id: string
		altText: string | null
		objectKey: string
	}>
}

interface CommentItemProps {
	comment: Comment
	noteId: string
	currentUserId: string
	users: MentionUser[]
	depth?: number
	onReply?: (commentId: string, content: string, images?: File[]) => void
	onDelete?: (commentId: string) => void
	organizationId: string
}

export function CommentItem({
	comment,
	noteId,
	currentUserId,
	users,
	depth = 0,
	onReply,
	onDelete,
	organizationId,
}: CommentItemProps) {
	const [showReplyForm, setShowReplyForm] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const handleReply = (content: string, images?: File[]) => {
		if (onReply) {
			onReply(comment.id, content, images)
			setShowReplyForm(false)
		}
	}

	const handleDelete = async () => {
		if (
			onDelete &&
			window.confirm('Are you sure you want to delete this comment?')
		) {
			setIsDeleting(true)
			onDelete(comment.id)
		}
	}

	const timeAgo = formatDistanceToNow(new Date(comment.createdAt))
	const canDelete = comment.user.id === currentUserId
	const maxDepth = 3 // Limit nesting depth

	return (
		<div className="relative">
			{/* Vertical line extending down from this comment if it has replies */}
			{comment.replies.length <= maxDepth && (
				<div
					className="border-border dark:border-muted absolute w-px rounded-bl-lg border-l"
					style={{
						left: `${depth * 2 + 1}rem`,
						top: '2.5rem',
						bottom: '0',
						width: '1rem',
					}}
				/>
			)}

			{/* Horizontal connection line for replies */}
			{depth > 0 && (
				<div
					className="border-border dark:border-muted absolute h-px rounded-bl-lg border-b"
					style={{
						left: `${(depth - 1) * 2 + 1}rem`,
						top: '0rem',
						width: '1rem',
						height: '1rem',
					}}
				/>
			)}

			<div className="group relative pt-2">
				<div
					className="flex items-start gap-3 transition-colors duration-150"
					style={{ marginLeft: depth > 0 ? `${depth * 2}rem` : '0' }}
				>
					<Avatar className="h-8 w-8 flex-shrink-0">
						<AvatarImage
							src={getUserImgSrc(comment.user.image?.objectKey)}
							alt={comment.user.name || comment.user.username}
						/>
						<AvatarFallback>
							{(comment.user.name || comment.user.username)
								.charAt(0)
								.toUpperCase()}
						</AvatarFallback>
					</Avatar>

					<div className="min-w-0 flex-1">
						<div className="mb-1 flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm">
								<span className="text-foreground font-medium">
									{comment.user.name || comment.user.username}
								</span>
								<span className="text-muted-foreground">{timeAgo} ago</span>
							</div>
							{canDelete && (
								<Button
									variant="ghost"
									size="sm"
									className="absolute top-0 right-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
									onClick={handleDelete}
									disabled={isDeleting}
								>
									<Icon name="trash-2" className="h-4 w-4" />
								</Button>
							)}
						</div>

						<div
							className="text-foreground prose prose-sm prose-p:my-1 mb-2 max-w-none text-sm leading-relaxed tracking-wider"
							dangerouslySetInnerHTML={{ __html: comment.content }}
						/>

						{/* Comment Images */}
						{comment.images && comment.images.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								{comment.images.map((image) => (
									<a
										key={image.id}
										href={getNoteImgSrc(image.objectKey, organizationId)}
										target="_blank"
										rel="noopener noreferrer"
										className="block"
									>
										<Img
											src={getNoteImgSrc(image.objectKey, organizationId)}
											alt={image.altText ?? ''}
											className="h-24 w-24 rounded-lg border object-cover transition-opacity hover:opacity-90"
											width={96}
											height={96}
										/>
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Render replies */}
			{comment.replies.length > 0 && (
				<div className="mb-8 space-y-3">
					{comment.replies.map((reply) => (
						<CommentItem
							key={reply.id}
							comment={reply}
							noteId={noteId}
							organizationId={organizationId}
							currentUserId={currentUserId}
							users={users}
							depth={depth + 1}
							onReply={onReply}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
			{/* Reply button for all comments */}
			{depth < maxDepth && !showReplyForm && (
				<div className="relative mt-2 flex items-center gap-2">
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowReplyForm(!showReplyForm)}
							className="text-muted-foreground hover:text-foreground absolute h-auto px-0 py-1 text-xs"
							style={{ marginLeft: `${depth * 2 + 2}rem` }}
						>
							<Icon name="paper-plane" className="mr-1 h-3 w-3" />
							Reply
						</Button>
						<div
							className="border-border dark:border-muted absolute h-px rounded-bl-lg border-b"
							style={{
								left: `${depth * 2 + 1}rem`,
								top: '-16px',
								width: '1rem',
								height: '1rem',
							}}
						/>
					</>
				</div>
			)}

			{/* Reply form for all comments */}
			{showReplyForm && (
				<div style={{ marginLeft: `${depth * 2 + 2}rem` }}>
					<CommentInput
						users={users}
						onSubmit={handleReply}
						value=""
						reply
						onCancel={() => setShowReplyForm(false)}
						placeholder="Write a reply..."
					/>
				</div>
			)}
		</div>
	)
}
