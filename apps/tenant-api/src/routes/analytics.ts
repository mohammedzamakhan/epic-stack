import { Hono } from 'hono'
import { ENV } from 'varlock/env'
import { z } from 'zod'
import { getTenantDb, customers, TENANT_ORG_ID_PATTERN } from '@repo/tenant-db'
import {
	isReportRunError,
	organizationCatalog,
	reportDefinitionSchema,
	runReport,
	type ReportRecord,
} from '@repo/reports'
import { verifyOperatorAnalyticsToken } from '@repo/reports/token'
import { findActiveOrganizationById } from '../lib/origin.ts'
import { getNodeRegion, orgMatchesNodeRegion } from '../lib/region.ts'
import { getBearerToken } from '../lib/secrets.ts'

export const analyticsRoutes = new Hono()

const querySchema = z.object({
	definition: reportDefinitionSchema,
})

function mapCustomer(row: {
	createdAt: Date | null
	phoneVerified: boolean | null
	email: string | null
	name: string | null
	phone: string | null
}): ReportRecord {
	return {
		createdAt: row.createdAt,
		phoneVerified: Boolean(row.phoneVerified),
		hasEmail: Boolean(row.email && row.email.length > 0),
		email: row.email ?? '',
		name: row.name ?? '',
		phone: row.phone ?? '',
	}
}

analyticsRoutes.post('/query', async (c) => {
	const token = getBearerToken(c.req.header('Authorization'))
	if (!token) {
		return c.json(
			{ error: 'unauthorized', message: 'Missing bearer token' },
			401,
		)
	}

	const claims = await verifyOperatorAnalyticsToken({
		internalCommandToken: ENV.INTERNAL_COMMAND_TOKEN || '',
		token,
	})
	if (!claims) {
		return c.json(
			{ error: 'unauthorized', message: 'Invalid operator token' },
			401,
		)
	}

	if (!TENANT_ORG_ID_PATTERN.test(claims.orgId)) {
		return c.json(
			{ error: 'unauthorized', message: 'Invalid organization' },
			401,
		)
	}

	const body = await c.req.json().catch(() => null)
	const parsed = querySchema.safeParse(body)
	if (!parsed.success) {
		return c.json(
			{
				error: 'invalid_definition',
				message: parsed.error.errors[0]?.message || 'Invalid report definition',
			},
			400,
		)
	}

	const { definition } = parsed.data
	if (definition.subject !== 'customers') {
		return c.json(
			{
				error: 'unknown_subject',
				message: 'This regional API only runs customer analytics.',
			},
			400,
		)
	}

	const organization = await findActiveOrganizationById(claims.orgId)
	if (!organization) {
		return c.json(
			{ error: 'unauthorized', message: 'Organization not found' },
			401,
		)
	}
	if (!orgMatchesNodeRegion(organization.dataRegion)) {
		return c.json(
			{
				error: 'region_mismatch',
				message: `Organization dataRegion "${organization.dataRegion}" does not match this node ("${getNodeRegion()}")`,
			},
			409,
		)
	}
	if (!organization.hasProvisionedDb) {
		return c.json(
			{
				error: 'tenant_not_provisioned',
				message: 'This organization has not provisioned a customer database.',
			},
			409,
		)
	}

	let db
	try {
		db = await getTenantDb(claims.orgId)
	} catch {
		return c.json(
			{
				error: 'tenant_not_provisioned',
				message: 'This organization has not provisioned a customer database.',
			},
			409,
		)
	}

	const rows = await db
		.select({
			createdAt: customers.createdAt,
			phoneVerified: customers.phoneVerified,
			email: customers.email,
			name: customers.name,
			phone: customers.phone,
		})
		.from(customers)

	const records = rows.map(mapCustomer)
	const result = runReport(organizationCatalog, definition, records)
	if (isReportRunError(result)) {
		const status = result.error === 'missing_group_by' ? 422 : 400
		return c.json(result, status)
	}

	return c.json(result)
})
