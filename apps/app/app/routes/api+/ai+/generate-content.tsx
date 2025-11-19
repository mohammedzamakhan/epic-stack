import { handleGenerateContent, generateNoteContent  } from '@repo/ai'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleGenerateContent(args, {
		requireUserId,
		generateNoteContent,
	})
}
