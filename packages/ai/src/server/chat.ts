import { google } from '@ai-sdk/google'
import { streamText, type CoreMessage } from 'ai'

export type ChatStreamOptions = {
	messages: CoreMessage[]
	systemPrompt: string
	modelName?: string
	maxDuration?: number
}

/**
 * Creates a streaming chat response using Google's Gemini model
 * @param options - Configuration options for the chat stream
 * @returns A streamable response that can be converted to a DataStreamResponse
 */
export function createChatStream(options: ChatStreamOptions) {
	const {
		messages,
		systemPrompt,
		modelName = 'models/gemini-2.5-flash',
	} = options

	const result = streamText({
		model: google(modelName),
		messages,
		system: systemPrompt,
	})

	return result
}
