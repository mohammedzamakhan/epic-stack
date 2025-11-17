import { type LoaderFunctionArgs } from 'react-router'
import { handleOAuthCallback } from '@repo/integrations'
import { requireUserId } from '#app/utils/auth.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleOAuthCallback(args, {
		requireUserId,
		redirectWithToast,
		prisma,
	})
}
