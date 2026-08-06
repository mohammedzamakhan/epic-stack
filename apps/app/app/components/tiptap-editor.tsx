'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { marked } from 'marked'

interface TiptapEditorProps {
	content: string
	onChange?: (content: string) => void
	placeholder?: string
	editable?: boolean
	className?: string
}

marked.setOptions({
	async: false,
})

export default function TiptapEditor({
	content,
	onChange,
	placeholder = 'Enter description...',
	editable = true,
	className = '',
}: TiptapEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
				bulletList: {
					keepMarks: true,
					keepAttributes: false,
				},
				orderedList: {
					keepMarks: true,
					keepAttributes: false,
				},
			}),
		],
		content: '',
		editable: editable,
		editorProps: {
			attributes: {
				class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none ${className}`,
			},
		},
		onUpdate: ({ editor }) => {
			if (onChange) {
				onChange(editor.getHTML())
			}
		},
	})

	useEffect(() => {
		if (editor && content) {
			const html = marked.parse(content) as string
			if (html !== editor.getHTML()) {
				editor.commands.setContent(html)
			}
		}
	}, [content, editor])

	// Update editable state
	useEffect(() => {
		if (editor) {
			editor.setEditable(editable)
		}
	}, [editor, editable])

	if (!editor) {
		return null
	}

	return (
		<div className="relative">
			<EditorContent editor={editor} />
			{editor.isEmpty && (
				<div className="text-muted-foreground/40 pointer-events-none absolute top-0 left-0 text-sm">
					{placeholder}
				</div>
			)}
		</div>
	)
}
