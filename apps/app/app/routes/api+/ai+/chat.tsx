import { handleChat } from '@repo/ai/route-handlers'
import { createChatStream, buildNoteChatSystemPrompt } from '@repo/ai/server'
import { requireUserId } from '@repo/auth'
import { markStepCompleted } from '@repo/common/onboarding'
import { brand } from '@repo/config/brand'
import { type ActionFunctionArgs } from 'react-router'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const action = async (args: ActionFunctionArgs) => {
	return handleChat(args, {
		requireUserId,
		createChatStream,
		buildNoteChatSystemPrompt,
		brandSystemPrompt: brand.ai.systemPrompt,
		markStepCompleted,
	})
}
