import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import {
	getTenantDb,
	customers,
	shopOrders,
	TENANT_ORG_ID_PATTERN,
} from '@repo/tenant-db'
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
import { getBearerToken, getInternalCommandToken } from '../lib/secrets.ts'

export const analyticsRoutes = new Hono()

const querySchema = z.object({
	definition: reportDefinitionSchema,
})

const TENANT_ANALYTICS_SUBJECTS = new Set(['customers', 'shop_orders'])

function formatMoney(cents: number, currency = 'usd') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
	}).format(cents / 100)
}

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

function mapShopOrder(row: {
	createdAt: Date | null
	status: string
	productName: string
	amountCents: number
	orgPayoutCents: number
	currency: string
	customerName: string | null
	customerPhone: string | null
	customerEmail: string | null
}): ReportRecord {
	const currency = row.currency || 'usd'
	return {
		createdAt: row.createdAt,
		status: row.status,
		productName: row.productName,
		amount: formatMoney(row.amountCents, currency),
		orgPayout: formatMoney(row.orgPayoutCents, currency),
		currency,
		customerName: row.customerName ?? '',
		customerPhone: row.customerPhone ?? '',
		customerEmail: row.customerEmail ?? '',
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
		internalCommandToken: getInternalCommandToken(),
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
	if (!TENANT_ANALYTICS_SUBJECTS.has(definition.subject)) {
		return c.json(
			{
				error: 'unknown_subject',
				message: 'This regional API does not support that report subject.',
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

	if (
		definition.subject === 'shop_orders' &&
		(organization.dataRegion || 'us') !== 'us'
	) {
		return c.json(
			{
				error: 'shop_not_available',
				message: 'Shop order reports are only available for US organizations.',
			},
			403,
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

	let records: ReportRecord[]
	if (definition.subject === 'customers') {
		const rows = await db
			.select({
				createdAt: customers.createdAt,
				phoneVerified: customers.phoneVerified,
				email: customers.email,
				name: customers.name,
				phone: customers.phone,
			})
			.from(customers)
		records = rows.map(mapCustomer)
	} else {
		const rows = await db
			.select({
				createdAt: shopOrders.createdAt,
				status: shopOrders.status,
				productName: shopOrders.productName,
				amountCents: shopOrders.amountCents,
				orgPayoutCents: shopOrders.orgPayoutCents,
				currency: shopOrders.currency,
				customerName: customers.name,
				customerPhone: customers.phone,
				customerEmail: customers.email,
			})
			.from(shopOrders)
			.leftJoin(customers, eq(shopOrders.customerId, customers.id))
		records = rows.map(mapShopOrder)
	}

	const result = runReport(organizationCatalog, definition, records)
	if (isReportRunError(result)) {
		const status = result.error === 'missing_group_by' ? 422 : 400
		return c.json(result, status)
	}

	return c.json(result)
})
