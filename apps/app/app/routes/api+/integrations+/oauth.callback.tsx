import { type LoaderFunctionArgs } from 'react-router'
import { handleOAuthCallback } from '@repo/integrations'
import { requireUserId } from '#app/utils/auth.server.ts'
import { redirectWithToast as _redirectWithToast } from '#app/utils/toast.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleOAuthCallback(args, {
		requireUserId,
		redirectWithToast: async (url: string, options: { title: string; description: string; type: string }) => {
			return await _redirectWithToast(url, {
				title: options.title,
				description: options.description,
				type: options.type as 'message' | 'success' | 'error',
			})
		},
		prisma,
	})
}
