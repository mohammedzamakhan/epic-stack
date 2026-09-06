import sanitizeHtml from 'sanitize-html'

const transformTargetBlankLinks = {
	a: (tagName: string, attribs: Record<string, string>) => {
		if (attribs.target === '_blank') {
			const rel = (attribs.rel || '').split(/\s+/).filter(Boolean)
			if (!rel.includes('noopener')) rel.push('noopener')
			if (!rel.includes('noreferrer')) rel.push('noreferrer')
			attribs.rel = rel.join(' ')
		}
		return { tagName, attribs }
	},
}

/**
 * Sanitize comment content to prevent XSS attacks while allowing safe HTML formatting
 * This handles user-generated content like comments that may contain:
 * - @mentions
 * - Basic formatting (bold, italic, links)
 * - Line breaks
 */
export function sanitizeCommentContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	// Configure sanitize-html to allow safe HTML tags for comment formatting
	return sanitizeHtml(content, {
		allowedTags: [
			// Text formatting
			'p',
			'br',
			'strong',
			'b',
			'em',
			'i',
			'u',
			'a',
			'span',
			// Lists
			'ul',
			'ol',
			'li',
			// Code
			'code',
			'pre',
		],
		allowedAttributes: {
			'*': ['class', 'data-mention-id', 'data-id', 'data-type'],
			a: ['href', 'target', 'rel'],
		},
		transformTags: transformTargetBlankLinks,
		allowedSchemes: [
			'http',
			'https',
			'mailto',
			'tel',
			'callto',
			'sms',
			'cid',
			'xmpp',
		],
	})
}

/**
 * Sanitize plain text content (no HTML allowed)
 * Use this for fields that should never contain HTML
 */
export function sanitizeTextContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	return sanitizeHtml(content, {
		allowedTags: [], // No HTML tags allowed
		allowedAttributes: {},
	})
}

/**
 * Sanitize website content that came from machine translation.
 *
 * Body fields allow a safe HTML subset because `ContentBlock.astro` renders
 * them with `set:html`. Every other website field is plain text and must have
 * all markup stripped even when a malicious or malformed translation echoes
 * tags back from the source text.
 */
export function sanitizeWebsiteContent(
	content: string,
	allowHtml: boolean,
): string {
	if (!content || typeof content !== 'string') return ''

	return sanitizeHtml(content, {
		allowedTags: allowHtml
			? [
					'p',
					'br',
					'strong',
					'b',
					'em',
					'i',
					'a',
					'ul',
					'ol',
					'li',
					'code',
					'pre',
				]
			: [],
		allowedAttributes: allowHtml ? { a: ['href', 'target', 'rel'] } : {},
		transformTags: allowHtml ? transformTargetBlankLinks : undefined,
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
	})
}

/**
 * Sanitize note content (richer formatting allowed)
 */
export function sanitizeNoteContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	return sanitizeHtml(content, {
		allowedTags: [
			'p',
			'br',
			'strong',
			'b',
			'em',
			'i',
			'u',
			'a',
			'span',
			'ul',
			'ol',
			'li',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'blockquote',
			'code',
			'pre',
			'div',
		],
		allowedAttributes: {
			'*': ['class', 'data-mention-id', 'data-id', 'data-type'],
			a: ['href', 'target', 'rel'],
		},
		transformTags: transformTargetBlankLinks,
		allowedSchemes: [
			'http',
			'https',
			'mailto',
			'tel',
			'callto',
			'sms',
			'cid',
			'xmpp',
		],
	})
}
