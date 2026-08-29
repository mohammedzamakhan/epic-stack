import { Input, Textarea } from '@cloudflare/kumo'
import * as React from 'react'

import {
	MARKDOWN_SYNTAX_HELP,
	parseMarkdownBlock,
	parseMarkdownInline,
} from '../../../lib/markdown'

export interface MarkdownFieldProps {
	value: unknown
	onChange: (value: string) => void
	label?: string
	multiline?: boolean
	pluginId?: string
}

export default function MarkdownField({
	value,
	onChange,
	label,
	multiline = false,
}: MarkdownFieldProps) {
	const text = typeof value === 'string' ? value : ''
	const [showPreview, setShowPreview] = React.useState(false)

	const previewHtml = React.useMemo(() => {
		if (!text.trim()) return ''
		return multiline ? parseMarkdownBlock(text) : parseMarkdownInline(text)
	}, [multiline, text])

	return (
		<div className="space-y-2">
			{label && (
				<label className="text-kumo-default block text-sm font-medium">
					{label}
				</label>
			)}
			{multiline ? (
				<Textarea
					value={text}
					onChange={(event) => onChange(event.target.value)}
					rows={4}
					placeholder="Write markdown…"
				/>
			) : (
				<Input
					value={text}
					onChange={(event) => onChange(event.target.value)}
					placeholder="Write markdown…"
				/>
			)}
			<p className="text-kumo-subtle text-xs">{MARKDOWN_SYNTAX_HELP}</p>
			<button
				type="button"
				className="text-brand text-xs font-medium hover:underline"
				onClick={() => setShowPreview((open) => !open)}
			>
				{showPreview ? 'Hide preview' : 'Show preview'}
			</button>
			{showPreview && previewHtml && (
				<div
					className="border-kumo-line bg-kumo-elevated text-kumo-default [&_.md-highlight]:bg-brand/20 [&_.text-brand]:text-brand rounded-lg border p-3 text-sm [&_.md-highlight]:rounded-sm [&_.md-highlight]:px-1"
					dangerouslySetInnerHTML={{ __html: previewHtml }}
				/>
			)}
		</div>
	)
}
