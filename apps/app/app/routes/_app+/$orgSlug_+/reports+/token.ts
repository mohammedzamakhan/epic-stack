import { requireUserId } from '@repo/auth'
import { mintOperatorAnalyticsToken } from '@repo/reports/token'
import { data } from 'react-router'
import { ENV } from 'varlock/env'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import { type Route } from './+types/token.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		dataRegion: true,
		hasProvisionedDb: true,
	})

	const minted = await mintOperatorAnalyticsToken({
		internalCommandToken: ENV.INTERNAL_COMMAND_TOKEN || '',
		userId,
		orgId: organization.id,
		role: 'operator',
	})

	const tenantApiUrl =
		organization.dataRegion === 'ksa'
			? (
					process.env.PUBLIC_TENANT_API_URL_KSA ||
					ENV.TENANT_API_URL_KSA ||
					'http://localhost:3009'
				).replace(/\/$/, '')
			: (
					process.env.PUBLIC_TENANT_API_URL ||
					ENV.TENANT_API_URL ||
					'http://localhost:3007'
				).replace(/\/$/, '')

	return data({
		...minted,
		tenantApiUrl,
		orgId: organization.id,
		hasProvisionedDb: organization.hasProvisionedDb,
	})
}
