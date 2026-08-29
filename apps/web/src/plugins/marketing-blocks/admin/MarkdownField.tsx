import { Input, Textarea } from '@cloudflare/kumo'
import { type Token, type Tokens } from 'marked'
import * as React from 'react'

import {
	isSafeHref,
	lexMarkdown,
	MARKDOWN_SYNTAX_HELP,
} from '../../../lib/markdown'

export interface MarkdownFieldProps {
	value: unknown
	onChange: (value: string) => void
	label?: string
	multiline?: boolean
	pluginId?: string
}

function MarkdownTokens({ tokens }: { tokens: Token[] }) {
	return tokens.map((token, index) => (
		<MarkdownToken key={`${token.type}-${index}`} token={token} />
	))
}

function MarkdownToken({ token }: { token: Token }) {
	switch (token.type) {
		case 'html':
		case 'image':
			return null
		case 'space':
			return ' '
		case 'br':
			return <br />
		case 'paragraph':
			return (
				<p>
					<MarkdownTokens tokens={token.tokens ?? []} />
				</p>
			)
		case 'strong':
			return (
				<strong>
					<MarkdownTokens tokens={token.tokens ?? []} />
				</strong>
			)
		case 'em':
			return (
				<em>
					<MarkdownTokens tokens={token.tokens ?? []} />
				</em>
			)
		case 'codespan':
			return <code>{token.text}</code>
		case 'link':
			if (!token.href || !isSafeHref(token.href)) {
				return token.tokens ? (
					<MarkdownTokens tokens={token.tokens} />
				) : (
					token.text
				)
			}
			return (
				<a className="underline underline-offset-2" href={token.href}>
					{token.tokens ? <MarkdownTokens tokens={token.tokens} /> : token.text}
				</a>
			)
		case 'list': {
			const list = token as Tokens.List
			const ListTag = list.ordered ? 'ol' : 'ul'
			return (
				<ListTag>
					{list.items.map((item, index) => (
						<li key={index}>
							<MarkdownTokens tokens={item.tokens} />
						</li>
					))}
				</ListTag>
			)
		}
		case 'highlight':
			return <mark className="md-highlight">{token.text}</mark>
		case 'brand':
			return <span className="text-brand">{token.text}</span>
		case 'text':
			return token.tokens ? (
				<MarkdownTokens tokens={token.tokens} />
			) : (
				token.text
			)
		default:
			if ('tokens' in token && token.tokens?.length) {
				return <MarkdownTokens tokens={token.tokens} />
			}
			if ('text' in token && typeof token.text === 'string') {
				return token.text
			}
			return null
	}
}

export default function MarkdownField({
	value,
	onChange,
	label,
	multiline = false,
}: MarkdownFieldProps) {
	const text = typeof value === 'string' ? value : ''
	const [showPreview, setShowPreview] = React.useState(false)
	const tokens = React.useMemo(
		() => (text.trim() ? lexMarkdown(text, multiline) : []),
		[multiline, text],
	)

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
			{showPreview && tokens.length > 0 && (
				<div className="border-kumo-line bg-kumo-elevated text-kumo-default [&_.md-highlight]:bg-brand/20 [&_.text-brand]:text-brand rounded-lg border p-3 text-sm [&_.md-highlight]:rounded-sm [&_.md-highlight]:px-1">
					<MarkdownTokens tokens={tokens} />
				</div>
			)}
		</div>
	)
}
