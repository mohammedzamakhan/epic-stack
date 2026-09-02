import { cn } from '@repo/ui'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { Markdown } from 'tiptap-markdown'

function isEditorReady(editor: Editor): boolean {
	return !editor.isDestroyed && editor.isInitialized
}

function getEditorHtml(editor: Editor | null): string {
	if (!editor || !isEditorReady(editor)) return ''
	return editor.getHTML()
}

interface ContentEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
	disabled?: boolean
	name?: string
}

export interface ContentEditorRef {
	setContent: (content: string) => void
	getContent: () => string
	focus: () => void
}

export const ContentEditor = forwardRef<ContentEditorRef, ContentEditorProps>(
	(
		{
			value,
			onChange,
			placeholder = 'Write your note content...',
			className,
			disabled = false,
			name,
		},
		ref,
	) => {
		const isInternalUpdate = useRef(false)

		const editor = useEditor({
			extensions: [StarterKit, Markdown],
			content: value,
			editorProps: {
				attributes: {
					class:
						'prose prose-sm max-w-none min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-3 overflow-y-auto',
				},
			},
			onUpdate: ({ editor }: { editor: Editor }) => {
				if (!isEditorReady(editor)) return
				isInternalUpdate.current = true
				onChange(editor.getHTML())
			},
			editable: !disabled,
		})

		useImperativeHandle(
			ref,
			() => ({
				setContent: (content: string) => {
					if (!editor || !isEditorReady(editor)) return
					if (content !== getEditorHtml(editor)) {
						isInternalUpdate.current = true
						editor.commands.setContent(content, { emitUpdate: false })
					}
				},
				getContent: () => getEditorHtml(editor),
				focus: () => {
					if (editor && isEditorReady(editor)) {
						editor.commands.focus()
					}
				},
			}),
			[editor],
		)

		useEffect(() => {
			if (!editor || !isEditorReady(editor)) return
			if (isInternalUpdate.current) {
				isInternalUpdate.current = false
				return
			}
			editor.commands.setContent(value, { emitUpdate: false })
		}, [editor, value])

		return (
			<div
				className={cn(
					'border-input bg-background ring-offset-background w-full rounded-md border text-sm',
					'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
					disabled && 'cursor-not-allowed opacity-50',
					className,
				)}
			>
				<EditorContent
					editor={editor}
					className="max-h-100 min-h-30 overflow-y-auto"
					placeholder={placeholder}
				/>
				{/* Hidden input for form submission */}
				{name && (
					<input
						type="hidden"
						name={name}
						value={getEditorHtml(editor) || value}
					/>
				)}
			</div>
		)
	},
)

ContentEditor.displayName = 'ContentEditor'
