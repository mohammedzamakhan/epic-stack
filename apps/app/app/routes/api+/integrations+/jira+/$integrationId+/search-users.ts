import { handleJiraSearchUsers } from '@repo/integrations'
import { prisma } from '@repo/prisma'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'

/**
 * API endpoint to search for Jira users
 * Used by the bot user configuration UI
 */
export async function loader(args: LoaderFunctionArgs) {
	return handleJiraSearchUsers(args, {
		requireUserId,
		getUserDefaultOrganization,
		prisma,
	})
}
