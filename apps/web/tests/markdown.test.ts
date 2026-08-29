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
})
