import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardFooter } from '@repo/ui/card'
import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'
import Mention from '@tiptap/extension-mention'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useEffect, useState } from 'react'
import { cn } from '#app/utils/misc.tsx'

import { CommentImagePreview } from './comment-image-preview'
import { CommentImageUpload } from './comment-image-upload'
import { EmojiPickerButton } from './emoji-picker-button'
import { default as getEmojiSuggestion } from './emoji-suggestions'
import getSuggestions from './suggestions'

export interface MentionUser {
	id: string
	name: string
	email: string
}

interface CommentInputProps {
	users: MentionUser[]
	onSubmit: (comment: string, images?: File[]) => void
	value: string
	className?: string
	reply?: boolean
	onCancel?: () => void
	placeholder?: string
	disabled?: boolean
}

const CommentInput: React.FC<CommentInputProps> = ({
	onSubmit,
	value,
	className,
	reply,
	onCancel,
	users,
	placeholder: _placeholder = 'Add a comment...',
	disabled = false,
}) => {
	const { _ } = useLingui()
	const [initialValue] = useState(value)
	const [content, setContent] = useState(value)
	const [selectedImages, setSelectedImages] = useState<File[]>([])

	const editor = useEditor({
		extensions: [
			StarterKit,
			Mention.configure({
				suggestion: getSuggestions(users),
				HTMLAttributes: {
					class:
						'mention bg-primary/10 text-primary px-1 py-0.5 rounded text-sm font-medium',
				},
			}),
			Emoji.configure({
				emojis: gitHubEmojis,
				enableEmoticons: true,
				suggestion: getEmojiSuggestion(),
			}),
		],
		content: initialValue,
		editorProps: {
			attributes: {
				class:
					'text-sm min-h-[40px] focus:outline-none max-w-full prose prose-sm max-w-none',
			},
		},
		onUpdate: ({ editor }: { editor: Editor }) => {
			setContent(editor.getHTML())
		},
	})

	useEffect(() => {
		if (editor && value === '') {
			editor.commands.setContent(value)
		}
	}, [editor, value])

	const handleSubmit = () => {
		if ((content.trim() || selectedImages.length > 0) && !disabled) {
			onSubmit(content, selectedImages)
			editor?.commands.clearContent()
			setContent('')
			setSelectedImages([])
		}
	}

	const handleImagesSelected = (files: File[]) => {
		setSelectedImages((prev) => [...prev, ...files].slice(0, 3)) // Max 3 images
	}

	const handleRemoveImage = (index: number) => {
		setSelectedImages((prev) => prev.filter((_, i) => i !== index))
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault()
			handleSubmit()
		}
	}

	const handleEmojiSelect = (emoji: string) => {
		if (editor) {
			editor.chain().focus().insertContent(emoji).run()
		}
	}

	return (
		<Card
			className={cn(
				'focus-within:ring-ring w-full transition-all focus-within:ring-2 focus-within:ring-offset-2',
				className,
			)}
			onKeyDown={handleKeyDown}
		>
			<CardContent className="p-4">
				<EditorContent
					editor={editor}
					className="min-h-[60px] focus:outline-none"
					placeholder={_(msg`Add a comment...`)}
				/>
				{selectedImages.length > 0 && (
					<div className="mt-3">
						<CommentImagePreview
							files={selectedImages}
							onRemove={handleRemoveImage}
						/>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between">
				<div className="flex items-center">
					<CommentImageUpload
						onImagesSelected={handleImagesSelected}
						maxImages={3 - selectedImages.length}
						disabled={disabled || selectedImages.length >= 3}
					/>
					<EmojiPickerButton
						onEmojiSelect={handleEmojiSelect}
						disabled={disabled}
					/>
					<div className="text-muted-foreground ml-2 text-xs">
						{reply ? (
							<Trans>Replying to comment</Trans>
						) : (
							<Trans>Use @ to mention someone • Cmd+Enter to submit</Trans>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					{reply && onCancel && (
						<Button
							type="button"
							onClick={onCancel}
							variant="outline"
							size="sm"
							disabled={disabled}
						>
							<Trans>Cancel</Trans>
						</Button>
					)}
					<Button
						size="sm"
						disabled={
							(!content.trim() && selectedImages.length === 0) || disabled
						}
						onClick={handleSubmit}
					>
						{reply ? <Trans>Reply</Trans> : <Trans>Comment</Trans>}
					</Button>
				</div>
			</CardFooter>
		</Card>
	)
}

export default CommentInput
