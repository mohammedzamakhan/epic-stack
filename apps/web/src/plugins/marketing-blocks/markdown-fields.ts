import { MARKDOWN_SYNTAX_HELP } from '../../lib/markdown'

export { MARKDOWN_SYNTAX_HELP }

export type MarkdownBlockField = {
	type: 'markdown_input'
	action_id: string
	label: string
	multiline?: boolean
}

/** Emdash Block Kit field for markdown-capable titles, headlines, and descriptions. */
export function markdownField(
	action_id: string,
	label: string,
	multiline = false,
): MarkdownBlockField {
	return {
		type: 'markdown_input',
		action_id,
		label,
		multiline,
	}
}
