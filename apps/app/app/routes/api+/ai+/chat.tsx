import {
	handleChat,
	createChatStream,
	buildNoteChatSystemPrompt,
} from '@repo/ai'
import { brand } from '@repo/config/brand'
import { prisma } from '@repo/prisma'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { markStepCompleted } from '@repo/common'

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
