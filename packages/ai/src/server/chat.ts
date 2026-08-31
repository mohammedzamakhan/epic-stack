import { google } from '@ai-sdk/google'
import { stepCountIs, streamText, type ModelMessage } from 'ai'

export type ChatStreamOptions = {
	messages: ModelMessage[]
	systemPrompt: string
	modelName?: string
	tools?: Record<string, any>
	maxDuration?: number
}

/**
 * Creates a streaming chat response using Google's Gemini model
 * @param options - Configuration options for the chat stream
 * @returns A streamable response that can be converted to a UI message stream
 */
export function createChatStream(options: ChatStreamOptions) {
	const {
		messages,
		systemPrompt,
		modelName = 'models/gemini-2.5-flash',
		tools,
	} = options

	const result = streamText({
		model: google(modelName),
		messages,
		system: systemPrompt,
		tools,
		// Allow the model to inspect a page (server tool) and then emit
		// client-side navigate/mutate calls in a follow-up step.
		...(tools ? { stopWhen: stepCountIs(5) } : {}),
	})

	return result
}
