import { requireUserId } from '@repo/auth'
import { handleUpdateIntegrationConfig } from '@repo/integrations'
import { type ActionFunctionArgs } from 'react-router'
import { getUserDefaultOrganization } from '#app/utils/organization/organizations.server.ts'
import { requireUserWithOrganizationPermission } from '#app/utils/organization/permissions.server.ts'

/**
 * API endpoint to update integration configuration
 * Used by the Jira bot user settings UI
 */
export async function action(args: ActionFunctionArgs) {
	return handleUpdateIntegrationConfig(args, {
		requireUserId,
		getUserDefaultOrganization,
		requireOrgPermission: async (request, organizationId, permission) => {
			await requireUserWithOrganizationPermission(
				request,
				organizationId,
				permission,
			)
		},
	})
}
