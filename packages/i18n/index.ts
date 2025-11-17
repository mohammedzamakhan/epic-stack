// Re-export Lingui core packages for convenience
export { i18n } from '@lingui/core'
export { I18nProvider } from '@lingui/react'
export { detect, fromUrl, fromNavigator, fromHtmlTag } from '@lingui/detect-locale'

// Core Lingui utilities
export { createCatalogLoader, loadCatalog } from './src/lingui'
export type { CatalogLoader } from './src/lingui'

// Server-side utilities
export {
	createLocaleCookie,
	createLinguiServer,
	getFallbackLanguage,
} from './src/lingui.server'

// Remix Lingui classes
export {
	RemixLingui,
	LanguageDetector,
	type RemixLinguiOptions,
	type LanguageDetectorOption,
} from './src/remix.server'

// Utility functions
export { getClientLocales, type Locales } from './src/utils'
