import { handleGenerateContent } from '@repo/ai/route-handlers'
import { generateNoteContent } from '@repo/ai/server'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '@repo/auth'

export async function action(args: ActionFunctionArgs) {
	return handleGenerateContent(args, {
		requireUserId,
		generateNoteContent,
	})
}
