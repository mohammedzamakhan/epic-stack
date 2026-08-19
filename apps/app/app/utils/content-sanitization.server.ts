import DOMPurify from 'isomorphic-dompurify'

// Enforce rel="noopener noreferrer" for all target="_blank" links
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
	if (data.attrName === 'target' && data.attrValue === '_blank') {
		const rel = node.getAttribute('rel') || ''
		const relValues = rel.split(/\s+/).filter(Boolean)
		if (!relValues.includes('noopener')) relValues.push('noopener')
		if (!relValues.includes('noreferrer')) relValues.push('noreferrer')
		node.setAttribute('rel', relValues.join(' '))
	}
})

/**
 * Sanitize comment content to prevent XSS attacks while allowing safe HTML formatting
 * This handles user-generated content like comments that may contain:
 * - @mentions
 * - Basic formatting (bold, italic, links)
 * - Line breaks
 */
export function sanitizeCommentContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	// Configure DOMPurify to allow safe HTML tags for comment formatting
	return DOMPurify.sanitize(content, {
		ALLOWED_TAGS: [
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
		ALLOWED_ATTR: [
			'href',
			'target',
			'rel',
			'class', // For styling mentions
			'data-mention-id', // For @mentions
			'data-id', // For TipTap mentions
			'data-type', // For TipTap mentions
		],
		// Additional security configurations
		ALLOW_DATA_ATTR: false, // Only allow specific data attributes
		ALLOW_UNKNOWN_PROTOCOLS: false,
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	})
}

/**
 * Sanitize plain text content (no HTML allowed)
 * Use this for fields that should never contain HTML
 */
export function sanitizeTextContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	return DOMPurify.sanitize(content, {
		ALLOWED_TAGS: [], // No HTML tags allowed
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true, // Keep text content, remove tags
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

	return DOMPurify.sanitize(content, {
		ALLOWED_TAGS: allowHtml
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
		ALLOWED_ATTR: allowHtml ? ['href', 'target', 'rel'] : [],
		KEEP_CONTENT: true,
		ALLOW_DATA_ATTR: false,
		ALLOW_UNKNOWN_PROTOCOLS: false,
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	})
}

/**
 * Sanitize note content (richer formatting allowed)
 */
export function sanitizeNoteContent(content: string): string {
	if (!content || typeof content !== 'string') return ''

	return DOMPurify.sanitize(content, {
		ALLOWED_TAGS: [
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
		ALLOWED_ATTR: [
			'href',
			'target',
			'rel',
			'class',
			'data-mention-id',
			'data-id',
			'data-type',
		],
		ALLOW_DATA_ATTR: false,
		ALLOW_UNKNOWN_PROTOCOLS: false,
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	})
}
