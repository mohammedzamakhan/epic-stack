// Re-export types from ai package
export type { CoreMessage } from 'ai'

// Server utilities
export * from './src/server/index.js'

// Components
export * from './src/components/index.js'

// Utils
export * from './src/utils/index.js'

// Route handlers
export {
	handleGenerateContent,
	handleChat,
	type GenerateContentDependencies,
	type ChatDependencies,
} from './src/route-handlers/index.js'
