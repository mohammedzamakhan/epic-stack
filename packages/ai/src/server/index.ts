// Chat utilities
export { createChatStream, type ChatStreamOptions } from './chat.js'

// Content generation
export {
	generateContent,
	generateNoteContent,
	type GenerateContentOptions,
} from './generate.js'

// Prompt builders
export {
	buildNoteChatSystemPrompt,
	type NoteContext,
} from './prompts.js'
