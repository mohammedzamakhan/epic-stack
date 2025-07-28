import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
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
}

interface CommentItemProps {
	comment: Comment
	noteId: string
	currentUserId: string
	users: MentionUser[]
	depth?: number
	onReply?: (commentId: string, content: string) => void
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

	const handleReply = (content: string) => {
		if (onReply) {
			onReply(comment.id, content)
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
		<div className={`${depth > 0 ? 'ml-4 border-l' : ''}`}>
			<div className="group rounded-lg p-2 hover:bg-muted/50">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-1 text-xs">
						<span className="font-medium">
							{comment.user.name || comment.user.username}
						</span>
						<span className="text-muted-foreground">•</span>
						<span className="text-muted-foreground">{timeAgo} ago</span>
					</div>
					{canDelete && (
						<Button
							variant="ghost"
							size="icon"
							className="opacity-0 group-hover:opacity-100 size-4"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							<Icon name="trash" className="h-4 w-4" />
						</Button>
					)}
				</div>

				<div
					className="text-sm prose prose-sm max-w-none"
					dangerouslySetInnerHTML={{ __html: comment.content }}
				/>

				<div className="mt-2 flex items-center gap-2">
					{depth < maxDepth && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowReplyForm(!showReplyForm)}
							className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
						>
							Reply
						</Button>
					)}
				</div>

				{showReplyForm && (
					<div className="mt-3">
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