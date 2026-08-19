import { type MessageDescriptor } from '@lingui/core'
import { generateMessageId } from '@lingui/message-utils/generateMessageId'

/**
 * Vite alias for `@lingui/core/macro`. Astro frontmatter cannot run Babel
 * macros, so `msg\`Sign in\`` becomes the same hashed descriptor Lingui
 * compile produces. Extraction still uses the Lingui CLI on the tagged
 * templates in `.astro` files.
 */
export function msg(
	strings: TemplateStringsArray,
	...values: unknown[]
): MessageDescriptor {
	if (values.length > 0) {
		throw new Error(
			'Sites chrome msg`...` templates must be static strings (no interpolations)',
		)
	}

	const message = strings[0] ?? ''
	return { id: generateMessageId(message), message }
}

export const defineMessage = msg
