import { Form, useRevalidator } from 'react-router'
import { useState } from 'react'
import { Icon } from '../ui/icon'
import { Button } from '../ui/button'
import CommentInput, { type MentionUser } from './comment-input'
import { CommentItem } from './comment-item'

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

interface CommentsSectionProps {
	noteId: string
	comments: Comment[]
	currentUserId: string
	users: MentionUser[]
}

export function CommentsSection({
	noteId,
	comments,
	currentUserId,
	users,
}: CommentsSectionProps) {
	const [newComment, setNewComment] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const revalidator = useRevalidator()



	const handleAddComment = async (content: string) => {
		setIsSubmitting(true)
		
		const formData = new FormData()
		formData.append('intent', 'add-comment')
		formData.append('noteId', noteId)
		formData.append('content', content)

		try {
			const response = await fetch(window.location.pathname, {
				method: 'POST',
				body: formData,
			})
			
			if (response.ok) {
				// Revalidate the data to show the new comment
				revalidator.revalidate()
			} else {
				const errorText = await response.text()
				console.error('Comment failed:', errorText)
			}
		} catch (error) {
			console.error('Error adding comment:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleReply = async (parentId: string, content: string) => {
		const formData = new FormData()
		formData.append('intent', 'add-comment')
		formData.append('noteId', noteId)
		formData.append('content', content)
		formData.append('parentId', parentId)

		try {
			const response = await fetch(window.location.pathname, {
				method: 'POST',
				body: formData,
			})
			
			if (response.ok) {
				// Revalidate the data to show the new reply
				revalidator.revalidate()
			} else {
				const errorText = await response.text()
				console.error('Reply failed:', errorText)
			}
		} catch (error) {
			console.error('Error adding reply:', error)
		}
	}

	const handleDelete = async (commentId: string) => {
		const formData = new FormData()
		formData.append('intent', 'delete-comment')
		formData.append('commentId', commentId)

		try {
			const response = await fetch(window.location.pathname, {
				method: 'POST',
				body: formData,
			})
			
			if (response.ok) {
				// Revalidate the data to remove the deleted comment
				revalidator.revalidate()
			} else {
				const errorText = await response.text()
				console.error('Delete failed:', errorText)
			}
		} catch (error) {
			console.error('Error deleting comment:', error)
		}
	}

	// Comments are already organized on the server side, no need to reorganize
	const organizedComments = comments

	return (
		<div className="border-t pt-6">
			<div className="flex items-center gap-2 mb-4">
				<Icon name="file-text" className="h-5 w-5" />
				<h3 className="text-lg font-semibold">
					Comments ({comments.length})
				</h3>
			</div>

			{/* Add new comment */}
			<div className="mb-6">
				<CommentInput
					users={users}
					onSubmit={handleAddComment}
					value={newComment}
					disabled={isSubmitting}
					placeholder="Add a comment..."
				/>
			</div>

			{/* Display comments */}
			<div className="space-y-4">
				{organizedComments.length > 0 ? (
					organizedComments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							noteId={noteId}
							currentUserId={currentUserId}
							users={users}
							onReply={handleReply}
							onDelete={handleDelete}
						/>
					))
				) : (
					<div className="text-center py-8 text-muted-foreground">
						<Icon name="file-text" className="h-12 w-12 mx-auto mb-2 opacity-50" />
						<p>No comments yet. Be the first to comment!</p>
					</div>
				)}
			</div>
		</div>
	)
}