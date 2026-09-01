import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { getNoteImgSrc, getUserImgSrc } from '@repo/common'
import { cn } from '@repo/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Button } from '@repo/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { formatDistanceToNow } from 'date-fns'
import DOMPurify from 'isomorphic-dompurify'
import { Img } from 'openimg/react'
import { useMemo, useState } from 'react'

import { SanitizedHtml } from '#app/components/sanitized-html.tsx'

import CommentInput, { type MentionUser } from './comment-input'

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
	if (data.attrName === 'target' && data.attrValue === '_blank') {
		const rel = node.getAttribute('rel') || ''
		const relValues = rel.split(/\s+/).filter(Boolean)
		if (!relValues.includes('noopener')) relValues.push('noopener')
		if (!relValues.includes('noreferrer')) relValues.push('noreferrer')
		node.setAttribute('rel', relValues.join(' '))
	}
})

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
	currentUserId: string
	users: MentionUser[]
	depth?: number
	replyingToId: string | null
	editingCommentId: string | null
	onReplyTo: (commentId: string) => void
	onCancelReply: () => void
	onEditTo: (commentId: string) => void
	onCancelEdit: () => void
	onReply?: (commentId: string, content: string, images?: File[]) => void
	onEdit?: (commentId: string, content: string) => void
	onDelete?: (commentId: string) => void
	organizationId: string
	isThreadRoot?: boolean
}

function formatCompactTime(date: string) {
	return formatDistanceToNow(new Date(date), { addSuffix: true }).replace(
		/^about /i,
		'',
	)
}

function countReplies(comment: Comment): number {
	return comment.replies.reduce(
		(total, reply) => total + 1 + countReplies(reply),
		0,
	)
}

export function CommentItem({
	comment,
	currentUserId,
	users,
	depth = 0,
	replyingToId,
	editingCommentId,
	onReplyTo,
	onCancelReply,
	onEditTo,
	onCancelEdit,
	onReply,
	onEdit,
	onDelete,
	organizationId,
	isThreadRoot = true,
}: CommentItemProps) {
	const { _ } = useLingui()
	const [repliesCollapsed, setRepliesCollapsed] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	const handleReply = (content: string, images?: File[]) => {
		if (onReply) {
			onReply(comment.id, content, images)
		}
	}

	const handleEdit = (content: string) => {
		if (onEdit) {
			onEdit(comment.id, content)
		}
	}

	const handleDelete = async () => {
		if (
			onDelete &&
			window.confirm(_(msg`Are you sure you want to delete this comment?`))
		) {
			setIsDeleting(true)
			onDelete(comment.id)
		}
	}

	const canManage = comment.user.id === currentUserId
	const maxDepth = 3
	const userName = comment.user.name || comment.user.username
	const replyCount = countReplies(comment)
	const hasReplies = comment.replies.length > 0
	const isReplyingHere = replyingToId === comment.id
	const isEditingHere = editingCommentId === comment.id
	const canReply =
		depth < maxDepth && replyingToId === null && editingCommentId === null

	const sanitizedContent = useMemo(() => {
		return DOMPurify.sanitize(comment.content, {
			ALLOWED_TAGS: [
				'p',
				'br',
				'strong',
				'b',
				'em',
				'i',
				'u',
				'a',
				'span',
				'ul',
				'ol',
				'li',
				'code',
				'pre',
			],
			ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-mention-id'],
			ALLOW_DATA_ATTR: false,
			ALLOW_UNKNOWN_PROTOCOLS: false,
		})
	}, [comment.content])

	return (
		<div
			className={cn(
				isThreadRoot && 'border-border border-b py-4 last:border-b-0',
			)}
		>
			<article className="group/comment flex gap-2.5">
				<Avatar className="size-7 shrink-0">
					<AvatarImage
						src={getUserImgSrc(comment.user.image?.objectKey)}
						alt={userName}
					/>
					<AvatarFallback className="text-[10px]">
						{userName.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="text-foreground text-sm font-semibold">
							{userName}
						</span>
						<div className="flex items-center gap-0.5">
							<time
								dateTime={comment.createdAt}
								className="text-muted-foreground text-xs"
							>
								{formatCompactTime(comment.createdAt)}
							</time>
							{canManage && !isEditingHere ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												variant="ghost"
												size="icon-sm"
												disabled={isDeleting}
												className="text-muted-foreground hover:text-foreground size-6 rounded-full"
												aria-label={_(msg`Comment actions`)}
											>
												<Icon name="ellipsis" className="size-3.5" />
											</Button>
										}
									/>
									<DropdownMenuContent align="start">
										<DropdownMenuItem onClick={() => onEditTo(comment.id)}>
											<Icon name="pencil" className="mr-2 size-4" />
											<Trans>Edit</Trans>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={handleDelete}
										>
											<Icon name="trash-2" className="mr-2 size-4" />
											<Trans>Delete</Trans>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					</div>

					{isEditingHere ? (
						<div className="mt-2">
							<CommentInput
								key={comment.id}
								variant="edit"
								users={users}
								onSubmit={handleEdit}
								value={comment.content}
								onCancel={onCancelEdit}
								placeholder={_(msg`Edit comment...`)}
							/>
						</div>
					) : (
						<SanitizedHtml
							className="text-foreground prose prose-sm prose-p:my-0.5 mt-1 max-w-none text-sm leading-relaxed"
							html={sanitizedContent}
						/>
					)}

					{comment.images && comment.images.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-2">
							{comment.images.map((image) => (
								<a
									key={image.id}
									href={getNoteImgSrc(image.objectKey, organizationId)}
									target="_blank"
									rel="noopener noreferrer"
									className="ring-border/60 hover:ring-foreground/20 focus-visible:ring-ring block overflow-hidden rounded-md ring-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:transition-shadow"
								>
									<Img
										src={getNoteImgSrc(image.objectKey, organizationId)}
										alt={image.altText ?? ''}
										className="size-16 object-cover sm:size-20"
										width={96}
										height={96}
									/>
								</a>
							))}
						</div>
					) : null}

					{!isEditingHere ? (
						<div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
							{canReply || isReplyingHere ? (
								<button
									type="button"
									onClick={() =>
										isReplyingHere ? onCancelReply() : onReplyTo(comment.id)
									}
									className="hover:text-foreground motion-safe:transition-colors"
								>
									{isReplyingHere ? (
										<Trans>Cancel</Trans>
									) : (
										<Trans>Reply</Trans>
									)}
								</button>
							) : null}
							{hasReplies ? (
								<button
									type="button"
									onClick={() => setRepliesCollapsed((collapsed) => !collapsed)}
									className="hover:text-foreground inline-flex items-center gap-1 motion-safe:transition-colors"
								>
									{repliesCollapsed ? (
										<Trans>Show replies ({replyCount})</Trans>
									) : (
										<Trans>Hide replies ({replyCount})</Trans>
									)}
									<Icon
										name="chevron-down"
										className={cn(
											'size-3.5 motion-safe:transition-transform',
											repliesCollapsed && '-rotate-90',
										)}
									/>
								</button>
							) : null}
						</div>
					) : null}

					{isReplyingHere ? (
						<div className="mt-3">
							<CommentInput
								variant="inline"
								users={users}
								onSubmit={handleReply}
								value=""
								reply
								onCancel={onCancelReply}
								placeholder={_(msg`Leave a reply...`)}
							/>
						</div>
					) : null}

					{hasReplies && !repliesCollapsed ? (
						<div className="border-border/60 relative mt-3 space-y-3 border-s border-dashed ps-4">
							{comment.replies.map((reply) => (
								<CommentItem
									key={reply.id}
									comment={reply}
									organizationId={organizationId}
									currentUserId={currentUserId}
									users={users}
									depth={depth + 1}
									isThreadRoot={false}
									replyingToId={replyingToId}
									editingCommentId={editingCommentId}
									onReplyTo={onReplyTo}
									onCancelReply={onCancelReply}
									onEditTo={onEditTo}
									onCancelEdit={onCancelEdit}
									onReply={onReply}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							))}
						</div>
					) : null}
				</div>
			</article>
		</div>
	)
}
