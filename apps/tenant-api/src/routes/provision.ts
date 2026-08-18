import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { ENV } from 'varlock/env'
import {
	destroyTenantDb,
	provisionTenantDb,
	TENANT_ORG_ID_PATTERN,
} from '@repo/tenant-db'
import { findActiveOrganizationById } from '../lib/origin.ts'
import { getNodeRegion, orgMatchesNodeRegion } from '../lib/region.ts'
import { getBearerToken, timingSafeEqualString } from '../lib/secrets.ts'

export const provisionRoutes = new Hono()

const orgIdSchema = z.object({
	orgId: z
		.string()
		.min(1, 'orgId is required')
		.regex(TENANT_ORG_ID_PATTERN, 'Invalid orgId format'),
})

function unauthorized(c: Context) {
	const internalToken = ENV.INTERNAL_COMMAND_TOKEN || ''
	if (internalToken.length < 16) {
		return c.json({ error: 'Provisioning is not configured' }, 503)
	}

	const presented = getBearerToken(c.req.header('Authorization'))
	if (!presented || !timingSafeEqualString(presented, internalToken)) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	return null
}

async function runTenantDbCommand(
	c: Context,
	command: 'provision' | 'deprovision',
) {
	const denied = unauthorized(c)
	if (denied) return denied

	const body = await c.req.json().catch(() => ({}))
	const parsed = orgIdSchema.safeParse(body)

	if (!parsed.success) {
		return c.json(
			{ error: parsed.error.errors[0]?.message || 'Invalid payload' },
			400,
		)
	}

	const { orgId } = parsed.data
	const nodeRegion = getNodeRegion()
	const organization = await findActiveOrganizationById(orgId)

	if (!organization) {
		return c.json({ error: 'Organization not found' }, 404)
	}

	if (!orgMatchesNodeRegion(organization.dataRegion)) {
		return c.json(
			{
				error: 'region_mismatch',
				message: `Organization dataRegion "${organization.dataRegion}" does not match this node ("${nodeRegion}")`,
				orgRegion: organization.dataRegion,
				nodeRegion,
			},
			409,
		)
	}

	try {
		if (command === 'provision') {
			await provisionTenantDb(orgId)
		} else {
			await destroyTenantDb(orgId)
		}
		const verb = command === 'provision' ? 'provisioned' : 'deleted'
		return c.json({
			success: true,
			orgId,
			region: nodeRegion,
			message: `Database ${verb} for tenant ${orgId} in ${nodeRegion}`,
		})
	} catch (error) {
		console.error(`Failed to ${command} DB for ${orgId}:`, error)
		return c.json(
			{
				error:
					command === 'provision'
						? 'Failed to provision tenant database'
						: 'Failed to delete tenant database',
			},
			500,
		)
	}
}

provisionRoutes.post('/provision', (c) => runTenantDbCommand(c, 'provision'))
provisionRoutes.post('/deprovision', (c) =>
	runTenantDbCommand(c, 'deprovision'),
)
