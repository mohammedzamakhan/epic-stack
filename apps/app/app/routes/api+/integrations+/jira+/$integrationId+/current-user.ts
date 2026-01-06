import { prisma } from '@repo/database'
import { handleJiraCurrentUser } from '@repo/integrations'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organization/organizations.server.ts'

/**
 * API endpoint to get current Jira user details
 * Used by the bot user configuration UI
 */
export async function loader(args: LoaderFunctionArgs) {
	return handleJiraCurrentUser(args, {
		requireUserId,
		getUserDefaultOrganization,
		prisma,
	})
}
