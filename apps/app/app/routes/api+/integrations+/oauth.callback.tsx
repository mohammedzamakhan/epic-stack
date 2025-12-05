import { prisma } from '@repo/database'
import { handleOAuthCallback } from '@repo/integrations'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { redirectWithToast as _redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleOAuthCallback(args, {
		requireUserId,
		redirectWithToast: async (
			url: string,
			options: { title: string; description: string; type: string },
		) => {
			return await _redirectWithToast(url, {
				title: options.title,
				description: options.description,
				type: options.type as 'message' | 'success' | 'error',
			})
		},
		prisma,
	})
}
