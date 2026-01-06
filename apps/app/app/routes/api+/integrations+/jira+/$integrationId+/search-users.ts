import { prisma } from '@repo/database'
import { handleJiraSearchUsers } from '@repo/integrations'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organization/organizations.server.ts'

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
