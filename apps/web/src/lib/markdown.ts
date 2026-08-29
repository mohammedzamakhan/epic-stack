import { marked, type TokenizerAndRendererExtension } from 'marked'

const highlightExtension: TokenizerAndRendererExtension = {
	name: 'highlight',
	level: 'inline',
	start(src) {
		return src.indexOf('==')
	},
	tokenizer(src) {
		const match = /^==([^=\n]+)==/.exec(src)
		if (!match) return undefined
		return {
			type: 'highlight',
			raw: match[0],
			text: match[1],
		}
	},
	renderer(token) {
		return `<mark class="md-highlight">${token.text}</mark>`
	},
}

const brandExtension: TokenizerAndRendererExtension = {
	name: 'brand',
	level: 'inline',
	start(src) {
		return src.indexOf('^^')
	},
	tokenizer(src) {
		const match = /^\^\^([^^\n]+)\^\^/.exec(src)
		if (!match) return undefined
		return {
			type: 'brand',
			raw: match[0],
			text: match[1],
		}
	},
	renderer(token) {
		return `<span class="text-brand">${token.text}</span>`
	},
}

marked.use({
	gfm: true,
	breaks: true,
	extensions: [highlightExtension, brandExtension],
})

/** Syntax editors can use in Emdash title and description fields. */
export const MARKDOWN_SYNTAX_HELP =
	'**bold** · *italic* · ==highlight== · ^^brand color^^ · [link](url)'

const INLINE_CLASS_ALLOWLIST = new Set([
	'md-highlight',
	'text-brand',
	'font-semibold',
	'italic',
])

/** Allow only safe span/mark tags with whitelisted classes from editor markdown. */
function sanitizeInlineHtml(html: string): string {
	return html.replace(
		/<(\/?)(span|mark|strong|em|b|i|a)(\s[^>]*)?>/gi,
		(match, slash, tag, attrs = '') => {
			if (slash) return `</${tag}>`

			if (tag === 'a') {
				const hrefMatch = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)
				if (!hrefMatch) return ''
				const href = hrefMatch[1]
				if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) {
					return `<a href="${href}" class="underline underline-offset-2">`
				}
				return ''
			}

			const classMatch = /class\s*=\s*["']([^"']+)["']/i.exec(attrs)
			if (!classMatch) {
				return tag === 'mark' ? '<mark class="md-highlight">' : `<${tag}>`
			}

			const safeClasses = classMatch[1]
				.split(/\s+/)
				.filter((cls) => INLINE_CLASS_ALLOWLIST.has(cls))
			if (safeClasses.length === 0) return `<${tag}>`
			return `<${tag} class="${safeClasses.join(' ')}">`
		},
	)
}

export function parseMarkdownInline(content: string): string {
	const html = marked.parseInline(content, { async: false }) as string
	return sanitizeInlineHtml(html)
}

export function parseMarkdownBlock(content: string): string {
	const html = marked.parse(content, { async: false }) as string
	return sanitizeInlineHtml(html)
}

/** Plain text for SEO meta tags, aria labels, and share dialogs. */
export function stripMarkdown(content: string): string {
	return content
		.replace(/==([^=]+)==/g, '$1')
		.replace(/\^\^([^^]+)\^\^/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/_([^_]+)_/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}
