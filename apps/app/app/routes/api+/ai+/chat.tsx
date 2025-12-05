import {
	handleChat,
	createChatStream,
	buildNoteChatSystemPrompt,
} from '@repo/ai'
import { markStepCompleted } from '@repo/common/onboarding'
import { brand } from '@repo/config/brand'
import { prisma } from '@repo/database'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const action = async (args: ActionFunctionArgs) => {
	return handleChat(args, {
		requireUserId,
		prisma,
		createChatStream,
		buildNoteChatSystemPrompt,
		brandSystemPrompt: brand.ai.systemPrompt,
		markStepCompleted,
	})
}
