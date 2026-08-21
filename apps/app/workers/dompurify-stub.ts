/**
 * Worker-safe HTML sanitizer with the DOMPurify API the app already calls.
 * jsdom (isomorphic-dompurify) and linkedom are too large for the Worker bundle.
 */
import sanitizeHtml from 'sanitize-html'

type SanitizeConfig = {
	ALLOWED_TAGS?: string[]
	ALLOWED_ATTR?: string[]
	ALLOW_DATA_ATTR?: boolean
	KEEP_CONTENT?: boolean
}

type AttrHook = (
	node: {
		getAttribute: (name: string) => string | null
		setAttribute: (name: string, value: string) => void
	},
	data: { attrName: string; attrValue: string },
) => void

function withBlankTargetRel(attribs: Record<string, string>) {
	if (attribs.target !== '_blank') return attribs
	const rel = (attribs.rel || '').split(/\s+/).filter(Boolean)
	if (!rel.includes('noopener')) rel.push('noopener')
	if (!rel.includes('noreferrer')) rel.push('noreferrer')
	return { ...attribs, rel: rel.join(' ') }
}

function sanitize(dirty: string, config?: SanitizeConfig): string {
	if (typeof dirty !== 'string') return ''

	const allowedTags = config?.ALLOWED_TAGS
	const allowedAttr = config?.ALLOWED_ATTR
	const allowedAttributes =
		allowedAttr === undefined
			? sanitizeHtml.defaults.allowedAttributes
			: allowedAttr.length === 0
				? {}
				: { '*': allowedAttr }

	return sanitizeHtml(dirty, {
		allowedTags:
			allowedTags === undefined
				? sanitizeHtml.defaults.allowedTags
				: allowedTags,
		allowedAttributes,
		allowProtocolRelative: false,
		transformTags: {
			a: (tagName, attribs) => ({
				tagName,
				attribs: withBlankTargetRel({ ...attribs }),
			}),
		},
	})
}

const DOMPurify = {
	sanitize,
	addHook(_name: string, _hook: AttrHook) {
		// target=_blank rel=noopener is applied in transformTags above.
	},
	removeHook(_name: string) {},
	removeAllHooks() {},
}

export default DOMPurify
