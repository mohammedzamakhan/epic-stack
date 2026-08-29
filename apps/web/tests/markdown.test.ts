import { describe, expect, it } from 'vitest'

import {
	parseMarkdownBlock,
	parseMarkdownInline,
	stripMarkdown,
} from '../src/lib/markdown'

describe('markdown', () => {
	it('parses inline bold, italic, highlight, and brand syntax', () => {
		const html = parseMarkdownInline(
			'Ship **faster** with *confidence* and ==highlighted== ^^brand^^ text',
		)

		expect(html).toContain('<strong>faster</strong>')
		expect(html).toContain('<em>confidence</em>')
		expect(html).toContain('<mark class="md-highlight">highlighted</mark>')
		expect(html).toContain('<span class="text-brand">brand</span>')
	})

	it('parses block markdown for descriptions', () => {
		const html = parseMarkdownBlock('Line one\n\nLine two with ==highlight==')

		expect(html).toContain('<p>')
		expect(html).toContain('<mark class="md-highlight">highlight</mark>')
	})

	it('strips markdown for plain-text metadata', () => {
		expect(stripMarkdown('Build your **next** ==startup== with ^^Epic^^')).toBe(
			'Build your next startup with Epic',
		)
	})

	it('does not emit raw HTML or javascript URLs', () => {
		expect(parseMarkdownInline('<script>alert(1)</script>')).not.toContain(
			'<script>',
		)
		expect(parseMarkdownInline('[x](javascript:alert(1))')).not.toContain(
			'javascript:',
		)
		expect(parseMarkdownInline('==<script>alert(1)</script>==')).toContain(
			'&lt;script',
		)
		expect(parseMarkdownInline('==<script>alert(1)</script>==')).not.toContain(
			'<script>',
		)
	})

	it('strips markdown including leftover HTML to plain text', () => {
		expect(stripMarkdown('Hello <script>alert(1)</script> **world**')).toBe(
			'Hello alert(1) world',
		)
	})
})
