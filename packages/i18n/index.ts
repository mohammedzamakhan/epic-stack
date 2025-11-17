// Re-export Lingui core packages for convenience (client-safe)
export { i18n } from '@lingui/core'
export { I18nProvider } from '@lingui/react'
export { detect, fromUrl, fromNavigator, fromHtmlTag } from '@lingui/detect-locale'

// Core Lingui utilities (client-safe)
export { createCatalogLoader, loadCatalog } from './src/lingui'
export type { CatalogLoader } from './src/lingui'

// Client utilities
export { getDirection } from './src/utils'

// Type exports (client-safe)
export type {
	RemixLinguiOptions,
	LanguageDetectorOption,
} from './src/remix.server'
export type { Locales } from './src/utils'
