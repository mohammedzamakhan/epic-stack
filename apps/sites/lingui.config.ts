import { extractor as babelExtractor } from '@lingui/cli/api'
import { type LinguiConfig } from '@lingui/conf'
import { astroExtractor } from './src/i18n/astro-extractor.ts'

/** Chrome catalogs. Matches `SITE_CONTENT_LOCALES`; unknown langs fall back to English. */
export const SITE_CHROME_LOCALES = ['en', 'ar', 'es', 'fr', 'de', 'zh'] as const

const config: LinguiConfig = {
	sourceLocale: 'en',
	fallbackLocales: {
		default: 'en',
	},
	locales: [...SITE_CHROME_LOCALES],
	catalogs: [
		{
			path: '<rootDir>/src/locales/{locale}',
			include: ['src'],
			exclude: ['**/node_modules/**', '**/locales/**'],
		},
	],
	extractors: [babelExtractor, astroExtractor],
}

export default config
