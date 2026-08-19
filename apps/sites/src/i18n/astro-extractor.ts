import { extractor as defaultExtractor } from '@lingui/cli/api'
import { type ExtractorType } from '@lingui/conf'

const MACRO_PATTERN =
	/\b(?:msg|t|defineMessage|plural)\s*(?:\([^)]*\))?\s*`(?:\\`|[^`])*`/g

/**
 * Pull Lingui tagged templates out of `.astro` files without parsing the
 * full frontmatter (which is not valid module JS because of top-level return).
 */
export const astroExtractor: ExtractorType = {
	match(filename: string) {
		return filename.endsWith('.astro')
	},
	extract(filename, code, onMessageExtracted, ctx) {
		const macros = code.match(MACRO_PATTERN)
		if (!macros?.length) return

		const fakeModule = `import { msg, t, defineMessage, plural } from '@lingui/core/macro'
export function messages() {
	return [${macros.join(', ')}]
}
`

		return defaultExtractor.extract(
			`${filename}.ts`,
			fakeModule,
			onMessageExtracted,
			ctx,
		)
	},
}
