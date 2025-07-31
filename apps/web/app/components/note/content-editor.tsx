import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useImperativeHandle, forwardRef } from 'react'
import { Markdown } from 'tiptap-markdown'
import { cn } from '#app/utils/misc.js'

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
		const editor = useEditor({
			extensions: [StarterKit, Markdown],
			content: value,
			editorProps: {
				attributes: {
					class:
						'prose prose-sm max-w-none min-h-[120px] focus:outline-none p-3 overflow-y-auto',
				},
			},
			onUpdate: ({ editor }: { editor: Editor }) => {
				const html = editor.getHTML()
				onChange(html)
			},
			editable: !disabled,
		})

		useImperativeHandle(
			ref,
			() => ({
				setContent: (content: string) => {
					if (editor && content !== editor.getHTML()) {
						editor.commands.setContent(content)
					}
				},
				getContent: () => editor?.getHTML() || '',
				focus: () => editor?.commands.focus(),
			}),
			[editor],
		)

		useEffect(() => {
			if (editor && value !== editor.getHTML()) {
				editor.commands.setContent(value)
			}
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
					className="max-h-[400px] min-h-[120px] overflow-y-auto"
					placeholder={placeholder}
				/>
				{/* Hidden input for form submission */}
				{name && (
					<input type="hidden" name={name} value={editor?.getHTML() || value} />
				)}
			</div>
		)
	},
)

ContentEditor.displayName = 'ContentEditor'
