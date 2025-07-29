import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Img } from 'openimg/react'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { getNoteImgSrc } from '#app/utils/misc'
import CommentInput, { type MentionUser } from './comment-input'

interface CommentUser {
	id: string
	name: string | null
	username: string
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
}

export function CommentItem({
	comment,
	noteId,
	currentUserId,
	users,
	depth = 0,
	onReply,
	onDelete,
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
		if (onDelete && window.confirm('Are you sure you want to delete this comment?')) {
			setIsDeleting(true)
			onDelete(comment.id)
		}
	}

	const timeAgo = formatDistanceToNow(new Date(comment.createdAt))
	const canDelete = comment.user.id === currentUserId
	const maxDepth = 3 // Limit nesting depth

	return (
		<div className={`${depth > 0 ? 'ml-6 pl-4 border-l border-border' : ''}`}>
			<div className="group relative">
				<div className="flex items-start gap-3 py-2">
					{/* Avatar placeholder */}
					<div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
						<span className="text-xs font-medium text-muted-foreground">
							{(comment.user.name || comment.user.username).charAt(0).toUpperCase()}
						</span>
					</div>
					
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between mb-1">
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium text-foreground">
									{comment.user.name || comment.user.username}
								</span>
								<span className="text-muted-foreground">
									{timeAgo} ago
								</span>
							</div>
							{canDelete && (
								<Button
									variant="ghost"
									size="sm"
									className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
									onClick={handleDelete}
									disabled={isDeleting}
								>
									<Icon name="trash" className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>

						<div
							className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none prose-p:my-1"
							dangerouslySetInnerHTML={{ __html: comment.content }}
						/>

						{/* Comment Images */}
						{comment.images && comment.images.length > 0 && (
							<div className="mt-3 flex flex-wrap gap-2">
								{comment.images.map((image) => (
									<a
										key={image.id}
										href={getNoteImgSrc(image.objectKey)}
										target="_blank"
										rel="noopener noreferrer"
										className="block"
									>
										<Img
											src={getNoteImgSrc(image.objectKey)}
											alt={image.altText ?? ''}
											className="w-24 h-24 rounded-lg object-cover border hover:opacity-90 transition-opacity"
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
									className="h-auto px-0 py-1 text-xs text-muted-foreground hover:text-foreground"
								>
									<Icon name="paper-plane" className="h-3 w-3 mr-1" />
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