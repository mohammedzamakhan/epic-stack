import { formatDistanceToNow } from 'date-fns'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { getNoteImgSrc, getUserImgSrc } from '#app/utils/misc'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import CommentInput, { type MentionUser } from './comment-input'

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
		<div className={`${depth > 0 ? 'border-border ml-6 border-l pl-4' : ''}`}>
			<div className="group relative">
				<div className="flex items-start gap-3 py-2">
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
									className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
									onClick={handleDelete}
									disabled={isDeleting}
								>
									<Icon name="trash" className="h-4 w-4" />
								</Button>
							)}
						</div>

						<div
							className="text-foreground prose prose-sm prose-p:my-1 max-w-none text-sm leading-relaxed tracking-wider"
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

						<div className="mt-2 flex items-center gap-2">
							{depth < maxDepth && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowReplyForm(!showReplyForm)}
									className="text-muted-foreground hover:text-foreground h-auto px-0 py-1 text-xs"
								>
									<Icon name="paper-plane" className="mr-1 h-3 w-3" />
									Reply
								</Button>
							)}
						</div>

						{showReplyForm && (
							<div className="mt-4">
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
				</div>
			</div>

			{/* Render replies */}
			{comment.replies.length > 0 && (
				<div className="mt-2">
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
		</div>
	)
}
