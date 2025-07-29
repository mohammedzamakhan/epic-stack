import Mention from '@tiptap/extension-mention'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useEffect, useState } from 'react'
import { cn } from '#app/utils/misc.js'
import { Button } from '../ui/button'
import getSuggestions from './suggestions'

export interface MentionUser {
	id: string
	name: string
	email: string
}

interface CommentInputProps {
	users: MentionUser[]
	onSubmit: (comment: string) => void
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
	placeholder = 'Add a comment...',
	disabled = false,
}) => {
	const [initialValue] = useState(value)
	const [content, setContent] = useState(value)

	const editor = useEditor({
		extensions: [
			StarterKit,
			Mention.configure({
				suggestion: getSuggestions(users),
				HTMLAttributes: {
					class: 'mention bg-primary/10 text-primary px-1 py-0.5 rounded text-sm font-medium',
				},
			}),
		],
		content: initialValue,
		editorProps: {
			attributes: {
				class: 'text-sm min-h-[40px] focus:outline-none max-w-full prose prose-sm max-w-none',
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
		if (content.trim() && !disabled) {
			onSubmit(content)
			editor?.commands.clearContent()
			setContent('')
		}
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault()
			handleSubmit()
		}
	}

	return (
		<div
			className={cn(
				'w-full rounded-lg border bg-card text-card-foreground shadow-xs focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all',
				className,
			)}
			onKeyDown={handleKeyDown}
		>
			<div className="px-4 py-3">
				<EditorContent
					editor={editor}
					className="min-h-[60px] focus:outline-none"
					placeholder={placeholder}
				/>
			</div>
			<div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
				<div className="text-xs text-muted-foreground">
					{reply ? 'Replying to comment' : 'Use @ to mention someone • Cmd+Enter to submit'}
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
							Cancel
						</Button>
					)}
					<Button
						size="sm"
						disabled={!content.trim() || disabled}
						onClick={handleSubmit}
					>
						{reply ? 'Reply' : 'Comment'}
					</Button>
				</div>
			</div>
		</div>
	)
}

export default CommentInput