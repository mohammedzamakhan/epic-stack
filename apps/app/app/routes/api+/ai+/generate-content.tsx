import { handleGenerateContent } from '@repo/ai/route-handlers'
import { generateNoteContent } from '@repo/ai/server'
import { requireUserId } from '@repo/auth'
import { type ActionFunctionArgs } from 'react-router'

export async function action(args: ActionFunctionArgs) {
	return handleGenerateContent(args, {
		requireUserId,
		generateNoteContent,
	})
}
