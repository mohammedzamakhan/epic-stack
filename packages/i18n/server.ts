// Server-only exports
export {
	createLocaleCookie,
	createLinguiServer,
	getFallbackLanguage,
} from './src/lingui.server'

export {
	RemixLingui,
	LanguageDetector,
	type RemixLinguiOptions,
	type LanguageDetectorOption,
} from './src/remix.server'

export { getClientLocales, type Locales } from './src/utils'
