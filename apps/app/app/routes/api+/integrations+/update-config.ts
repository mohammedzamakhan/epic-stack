import { prisma } from '@repo/database'
import { handleUpdateIntegrationConfig } from '@repo/integrations'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organization/organizations.server.ts'

/**
 * API endpoint to update integration configuration
 * Used by the Jira bot user settings UI
 */
export async function action(args: ActionFunctionArgs) {
	return handleUpdateIntegrationConfig(args, {
		requireUserId,
		getUserDefaultOrganization,
		prisma,
	})
}
