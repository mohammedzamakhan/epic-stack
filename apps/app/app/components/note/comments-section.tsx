import { useState } from 'react'
import { useRevalidator } from 'react-router'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import CommentInput, { type MentionUser } from './comment-input'
import { CommentItem } from './comment-item'
import { Icon } from '@repo/ui/icon'

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

interface CommentsSectionProps {
	noteId: string
	comments: Comment[]
	currentUserId: string
	users: MentionUser[]
	organizationId: string
}

export function CommentsSection({
	noteId,
	comments,
	currentUserId,
	users,
	organizationId,
}: CommentsSectionProps) {
	const { _ } = useLingui()
	const [newComment] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const revalidator = useRevalidator()

	// Shared helper to submit comments and replies
	const submitComment = async (
		content: string,
		images: File[] | undefined,
		parentId?: string,
	) => {
		const formData = new FormData()
		formData.append('intent', 'add-comment')
		formData.append('noteId', noteId)
		formData.append('content', content)

		if (parentId) {
			formData.append('parentId', parentId)
		}

		// Add images to form data
		if (images && images.length > 0) {
			images.forEach((image, index) => {
				formData.append(`image-${index}`, image)
			})
			formData.append('imageCount', images.length.toString())
		}

		try {
			const response = await fetch(window.location.pathname, {
				method: 'POST',
				body: formData,
			})

			if (response.ok) {
				// Revalidate the data to show the new comment/reply
				void revalidator.revalidate()
			} else {
				const errorText = await response.text()
				const action = parentId ? 'Reply' : 'Comment'
				console.error(`${action} failed:`, errorText)
			}
		} catch (error) {
			const action = parentId ? 'adding reply' : 'adding comment'
			console.error(`Error ${action}:`, error)
		}
	}

	const handleAddComment = async (content: string, images?: File[]) => {
		setIsSubmitting(true)
		try {
			await submitComment(content, images)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleReply = async (
		parentId: string,
		content: string,
		images?: File[],
	) => {
		await submitComment(content, images, parentId)
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
				void revalidator.revalidate()
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
		<div>
			{/* Section Header */}
			<div className="mb-2 flex items-center gap-2">
				<Icon name="message-square" className="text-muted-foreground h-5 w-5" />
				<h2 className="text-lg font-semibold">
					<Trans>Comments</Trans>
				</h2>
				{comments.length > 0 && (
					<span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-sm">
						{comments.length}
					</span>
				)}
			</div>

			{/* Add new comment */}
			<div className="mb-6">
				<CommentInput
					users={users}
					onSubmit={handleAddComment}
					value={newComment}
					disabled={isSubmitting}
					placeholder={_(msg`Add a comment...`)}
				/>
			</div>

			{/* Display comments */}
			<div className="flex flex-col space-y-2">
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
							organizationId={organizationId}
						/>
					))
				) : (
					<div className="py-12 text-center">
						<div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
							<Icon
								name="chat-bubble"
								className="text-muted-foreground h-6 w-6"
							/>
						</div>
						<h3 className="text-foreground mb-1 text-sm font-medium">
							<Trans>No comments yet</Trans>
						</h3>
						<p className="text-muted-foreground text-sm">
							<Trans>Start the conversation by adding the first comment.</Trans>
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
