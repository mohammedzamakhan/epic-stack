/**
 * Organization shop utilities — Stripe Connect onboarding, product config,
 * checkout sessions, and order recording (US region only).
 */

import { getDomainUrl } from '@repo/common'
import {
	and,
	db,
	desc,
	eq,
	inArray,
	isNull,
	Organization as OrganizationTable,
} from '@repo/database'
import {
	calculateShopFees,
	createConnectAccountLink,
	createConnectExpressAccount,
	createConnectLoginLink,
	createShopCheckoutSession,
	createShopPaymentIntent,
	createStripeProvider,
	retrieveConnectAccountStatus,
	SHOP_PLATFORM_FEE_PERCENT,
} from '@repo/payments'
import {
	getTenantDb,
	shopOrders,
	customers,
	customerPaymentMethods,
} from '@repo/tenant-db'
import type Stripe from 'stripe'
import { resolveVerifiedShopCustomer } from '#app/utils/tenant-customer-auth.server.ts'
import { type ShopOrganization } from './shop.types.ts'

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error('STRIPE_SECRET_KEY environment variable is not set!')
}

const paymentProvider = createStripeProvider(process.env.STRIPE_SECRET_KEY)
const stripe = paymentProvider.getClient()

let cachedStripePublishableKey: string | undefined

function loadStripePublishableKey() {
	const key = process.env.STRIPE_PUBLISHABLE_KEY?.trim()
	if (!key) {
		throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is not set!')
	}
	if (shouldValidateShopStripeKeys()) {
		assertStripePublishableKey(process.env.STRIPE_SECRET_KEY!, key)
	}
	return key
}

function shouldValidateShopStripeKeys() {
	return process.env.MOCKS !== 'true' && process.env.NODE_ENV !== 'test'
}

export { SHOP_PLATFORM_FEE_PERCENT, calculateShopFees } from '@repo/payments'
export type { ShopOrganization, ShopOrderSummary } from './shop.types.ts'

function getStripeErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) {
		return error.message.replaceAll(
			process.env.STRIPE_SECRET_KEY ?? '',
			'[redacted]',
		)
	}
	return 'Stripe request failed'
}

async function withSafeStripe<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation()
	} catch (error) {
		throw new Error(getStripeErrorMessage(error))
	}
}

function getStripeKeyPayload(key: string) {
	return key.match(/^(?:sk|rk|pk)_(?:test|live)_(.+)$/)?.[1] ?? null
}

function getStripeKeyMode(key: string) {
	if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) return 'test'
	if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) return 'live'
	return null
}

function assertStripePublishableKey(secretKey: string, publishableKey: string) {
	if (publishableKey.includes('***')) {
		throw new Error(
			'STRIPE_PUBLISHABLE_KEY is still the schema placeholder. Add your real pk_test_ key to apps/app/.env.',
		)
	}

	if (
		!publishableKey.startsWith('pk_test_') &&
		!publishableKey.startsWith('pk_live_')
	) {
		throw new Error(
			'STRIPE_PUBLISHABLE_KEY must be a valid pk_test_ or pk_live_ key.',
		)
	}

	const secretMode = getStripeKeyMode(secretKey)
	const publishableMode = getStripeKeyMode(publishableKey)
	if (secretMode && publishableMode && secretMode !== publishableMode) {
		throw new Error(
			'STRIPE_PUBLISHABLE_KEY mode does not match STRIPE_SECRET_KEY (test vs live).',
		)
	}

	const secretPayload = getStripeKeyPayload(secretKey)
	const publishablePayload = getStripeKeyPayload(publishableKey)
	if (!secretPayload || !publishablePayload) return

	// New-format keys embed the account id (51…). Legacy pk_test keys do not, so only
	// compare when both keys use the new format.
	const usesNewFormat = (payload: string) =>
		payload.startsWith('51') && payload.length >= 20

	if (usesNewFormat(secretPayload) && usesNewFormat(publishablePayload)) {
		const compareLength = Math.min(
			secretPayload.length,
			publishablePayload.length,
			14,
		)
		if (
			secretPayload.slice(0, compareLength) !==
			publishablePayload.slice(0, compareLength)
		) {
			throw new Error(
				'STRIPE_PUBLISHABLE_KEY does not match STRIPE_SECRET_KEY (different Stripe accounts). Copy the publishable key from the same Stripe dashboard as your secret key.',
			)
		}
		return
	}

	console.warn(
		'STRIPE_PUBLISHABLE_KEY uses a legacy format; account-id cross-check was skipped. Ensure both keys belong to the same Stripe account.',
	)
}

function getStripePublishableKey() {
	if (!cachedStripePublishableKey) {
		cachedStripePublishableKey = loadStripePublishableKey()
	}
	return cachedStripePublishableKey
}

const shopOrganizationColumns = {
	id: OrganizationTable.id,
	name: OrganizationTable.name,
	slug: OrganizationTable.slug,
	dataRegion: OrganizationTable.dataRegion,
	hasProvisionedDb: OrganizationTable.hasProvisionedDb,
	customDomain: OrganizationTable.customDomain,
	sitePublished: OrganizationTable.sitePublished,
	stripeConnectAccountId: OrganizationTable.stripeConnectAccountId,
	stripeConnectChargesEnabled: OrganizationTable.stripeConnectChargesEnabled,
	stripeConnectPayoutsEnabled: OrganizationTable.stripeConnectPayoutsEnabled,
	shopProductName: OrganizationTable.shopProductName,
	shopProductDescription: OrganizationTable.shopProductDescription,
	shopProductPriceCents: OrganizationTable.shopProductPriceCents,
	shopEnabled: OrganizationTable.shopEnabled,
} as const

export async function findPublishedShopOrganization(options: {
	slug?: string | null
	host?: string | null
}): Promise<ShopOrganization | null> {
	const slug = options.slug?.trim().toLowerCase() || null
	const host = options.host?.trim().toLowerCase().split(':')[0] || null

	if (!slug && !host) return null

	const [organization] = await db
		.select(shopOrganizationColumns)
		.from(OrganizationTable)
		.where(
			slug
				? and(
						eq(OrganizationTable.slug, slug),
						eq(OrganizationTable.active, true),
						eq(OrganizationTable.sitePublished, true),
					)
				: and(
						eq(OrganizationTable.customDomain, host!),
						eq(OrganizationTable.active, true),
						eq(OrganizationTable.sitePublished, true),
						inArray(OrganizationTable.customDomainStatus, [
							'active',
							'pending',
						]),
					),
		)
		.limit(1)

	return organization || null
}

export function isShopAvailableForOrganization(
	organization: Pick<
		ShopOrganization,
		| 'dataRegion'
		| 'stripeConnectAccountId'
		| 'stripeConnectChargesEnabled'
		| 'shopEnabled'
		| 'shopProductName'
		| 'shopProductPriceCents'
	>,
) {
	return (
		(organization.dataRegion || 'us') === 'us' &&
		Boolean(organization.stripeConnectAccountId) &&
		organization.stripeConnectChargesEnabled &&
		organization.shopEnabled &&
		Boolean(organization.shopProductName?.trim()) &&
		typeof organization.shopProductPriceCents === 'number' &&
		organization.shopProductPriceCents >= 50
	)
}

export function getPublicShopProduct(organization: ShopOrganization) {
	if (!isShopAvailableForOrganization(organization)) return null

	const { platformFeeCents, orgPayoutCents } = calculateShopFees(
		organization.shopProductPriceCents!,
	)

	return {
		name: organization.shopProductName!,
		description: organization.shopProductDescription,
		priceCents: organization.shopProductPriceCents!,
		currency: 'usd',
		platformFeePercent: SHOP_PLATFORM_FEE_PERCENT,
		platformFeeCents,
		orgPayoutCents,
	}
}

function getSiteBaseUrl(organization: {
	slug: string
	customDomain: string | null
}) {
	const suffix =
		process.env.PUBLIC_SITE_HOST_SUFFIXES?.split(',')[0]?.trim() ||
		'localhost:3008'
	const protocol = suffix.includes('localhost') ? 'http' : 'https'
	if (organization.customDomain) {
		return `${protocol}://${organization.customDomain}`
	}
	return `${protocol}://${organization.slug}.${suffix}`
}

export async function syncConnectAccountStatus(organizationId: string) {
	const [organization] = await db
		.select({
			id: OrganizationTable.id,
			stripeConnectAccountId: OrganizationTable.stripeConnectAccountId,
		})
		.from(OrganizationTable)
		.where(eq(OrganizationTable.id, organizationId))
		.limit(1)

	if (!organization?.stripeConnectAccountId) return null

	const status = await withSafeStripe(() =>
		retrieveConnectAccountStatus(stripe, organization.stripeConnectAccountId!),
	)

	await db
		.update(OrganizationTable)
		.set({
			stripeConnectChargesEnabled: status.chargesEnabled,
			stripeConnectPayoutsEnabled: status.payoutsEnabled,
			updatedAt: new Date(),
		})
		.where(eq(OrganizationTable.id, organizationId))

	return status
}

export async function startConnectOnboarding(
	request: Request,
	organization: Pick<
		ShopOrganization,
		'id' | 'name' | 'slug' | 'dataRegion' | 'stripeConnectAccountId'
	>,
) {
	if ((organization.dataRegion || 'us') !== 'us') {
		throw new Error(
			'Stripe Connect shop is only available for US organizations.',
		)
	}

	let accountId = organization.stripeConnectAccountId

	if (!accountId) {
		const account = await withSafeStripe(() =>
			createConnectExpressAccount(stripe, {
				organizationId: organization.id,
				organizationName: organization.name,
			}),
		)

		const [claimed] = await db
			.update(OrganizationTable)
			.set({
				stripeConnectAccountId: account.id,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(OrganizationTable.id, organization.id),
					isNull(OrganizationTable.stripeConnectAccountId),
				),
			)
			.returning({
				stripeConnectAccountId: OrganizationTable.stripeConnectAccountId,
			})

		if (claimed?.stripeConnectAccountId) {
			accountId = claimed.stripeConnectAccountId
		} else {
			const [refreshed] = await db
				.select({
					stripeConnectAccountId: OrganizationTable.stripeConnectAccountId,
				})
				.from(OrganizationTable)
				.where(eq(OrganizationTable.id, organization.id))
				.limit(1)
			accountId = refreshed?.stripeConnectAccountId ?? account.id
		}
	}

	const appBase = getDomainUrl(request)
	const refreshUrl = `${appBase}/${organization.slug}/settings/shop?connect=refresh`
	const returnUrl = `${appBase}/${organization.slug}/settings/shop?connect=return`

	const accountLink = await withSafeStripe(() =>
		createConnectAccountLink(stripe, {
			accountId,
			refreshUrl,
			returnUrl,
		}),
	)

	return accountLink.url
}

export async function createConnectDashboardLink(accountId: string) {
	const loginLink = await withSafeStripe(() =>
		createConnectLoginLink(stripe, accountId),
	)
	return loginLink.url
}

export async function updateShopProduct(
	organizationId: string,
	data: {
		productName: string
		productDescription?: string
		priceCents: number
		enabled: boolean
	},
) {
	await db
		.update(OrganizationTable)
		.set({
			shopProductName: data.productName.trim(),
			shopProductDescription: data.productDescription?.trim() || null,
			shopProductPriceCents: data.priceCents,
			shopEnabled: data.enabled,
			updatedAt: new Date(),
		})
		.where(eq(OrganizationTable.id, organizationId))
}

export async function createPublicShopCheckoutSession(options: {
	request: Request
	slug?: string | null
	host?: string | null
	customerId?: string | null
	customerEmail?: string | null
}) {
	const organization = await findPublishedShopOrganization({
		slug: options.slug,
		host: options.host,
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	if ((organization.dataRegion || 'us') !== 'us') {
		throw new Response('Shop is not available in this region', { status: 403 })
	}

	if (!isShopAvailableForOrganization(organization)) {
		throw new Response('Shop is not configured', { status: 404 })
	}

	const verifiedCustomer = await resolveVerifiedShopCustomer(
		options.request,
		organization.id,
		options.customerId,
	)

	if (options.customerEmail) {
		throw new Response(
			'Customer email must not be supplied in the request body',
			{
				status: 400,
			},
		)
	}

	const siteBase = getSiteBaseUrl(organization)
	const metadata: Record<string, string> = {
		type: 'shop_order',
		orgId: organization.id,
		productName: organization.shopProductName!,
	}

	if (verifiedCustomer?.customerId) {
		metadata.customerId = verifiedCustomer.customerId
	}

	const session = await withSafeStripe(() =>
		createShopCheckoutSession(stripe, {
			connectedAccountId: organization.stripeConnectAccountId!,
			productName: organization.shopProductName!,
			productDescription: organization.shopProductDescription,
			amountCents: organization.shopProductPriceCents!,
			successUrl: `${siteBase}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
			cancelUrl: `${siteBase}/shop`,
			metadata,
			customerEmail: verifiedCustomer?.customerEmail ?? null,
		}),
	)

	return { session, organization }
}

export async function createPublicShopPaymentIntent(options: {
	request: Request
	slug?: string | null
	host?: string | null
	customerId?: string | null
}) {
	const organization = await findPublishedShopOrganization({
		slug: options.slug,
		host: options.host,
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	if ((organization.dataRegion || 'us') !== 'us') {
		throw new Response('Shop is not available in this region', { status: 403 })
	}

	if (!isShopAvailableForOrganization(organization)) {
		throw new Response('Shop is not configured', { status: 404 })
	}

	const verifiedCustomer = await resolveVerifiedShopCustomer(
		options.request,
		organization.id,
		options.customerId,
	)

	const metadata: Record<string, string> = {
		type: 'shop_order',
		orgId: organization.id,
		productName: organization.shopProductName!,
	}

	if (verifiedCustomer?.customerId) {
		metadata.customerId = verifiedCustomer.customerId
	}

	let stripeCustomerId: string | undefined
	if (verifiedCustomer?.customerId) {
		const tenantDb = await getTenantDb(organization.id)
		stripeCustomerId = await getOrCreateShopStripeCustomer(
			tenantDb,
			verifiedCustomer.customerId,
		)
		await syncCustomerPaymentMethodsToStripe(
			tenantDb,
			verifiedCustomer.customerId,
			stripeCustomerId,
		)
	}

	const paymentIntent = await withSafeStripe(() =>
		createShopPaymentIntent(stripe, {
			connectedAccountId: organization.stripeConnectAccountId!,
			amountCents: organization.shopProductPriceCents!,
			currency: 'usd',
			metadata,
			stripeCustomerId,
			setupFutureUsage: stripeCustomerId ? 'off_session' : undefined,
		}),
	)

	if (!paymentIntent.client_secret) {
		throw new Response('Unable to create payment intent', { status: 500 })
	}

	return {
		clientSecret: paymentIntent.client_secret,
		paymentIntentId: paymentIntent.id,
		publishableKey: getStripePublishableKey(),
		organization,
	}
}

export async function listOrganizationShopOrders(organizationId: string) {
	try {
		const tenantDb = await getTenantDb(organizationId)
		return tenantDb
			.select({
				id: shopOrders.id,
				productName: shopOrders.productName,
				amountCents: shopOrders.amountCents,
				platformFeeCents: shopOrders.platformFeeCents,
				orgPayoutCents: shopOrders.orgPayoutCents,
				currency: shopOrders.currency,
				status: shopOrders.status,
				createdAt: shopOrders.createdAt,
				customerName: customers.name,
				customerPhone: customers.phone,
				customerEmail: customers.email,
			})
			.from(shopOrders)
			.leftJoin(customers, eq(shopOrders.customerId, customers.id))
			.orderBy(desc(shopOrders.createdAt))
			.limit(50)
	} catch {
		return []
	}
}

export async function recordShopOrderFromCheckoutSession(
	session: Stripe.Checkout.Session,
) {
	if (session.metadata?.type !== 'shop_order') return null

	const orgId = session.metadata.orgId
	if (!orgId) return null

	const amountCents = session.amount_total
	if (amountCents == null) return null

	const { platformFeeCents, orgPayoutCents } = calculateShopFees(amountCents)
	const paymentIntentId =
		typeof session.payment_intent === 'string'
			? session.payment_intent
			: session.payment_intent?.id || null

	const customerId = await resolveShopOrderCustomerId(
		orgId,
		session.metadata.customerId || null,
	)
	const productName =
		session.metadata.productName || session.metadata.product_name || 'Product'

	const tenantDb = await getTenantDb(orgId)
	const orderId = await upsertShopOrder(tenantDb, {
		customerId,
		productName,
		amountCents,
		platformFeeCents,
		orgPayoutCents,
		currency: session.currency || 'usd',
		stripeCheckoutSessionId: session.id,
		stripePaymentIntentId: paymentIntentId,
		status: session.payment_status === 'paid' ? 'paid' : 'pending',
	})

	if (paymentIntentId && customerId && session.payment_status === 'paid') {
		try {
			const paymentIntent = await withSafeStripe(() =>
				stripe.paymentIntents.retrieve(paymentIntentId, {
					expand: ['payment_method'],
				}),
			)
			await syncCustomerPaymentMethodFromIntent(
				tenantDb,
				customerId,
				paymentIntent,
			)
		} catch (error) {
			console.error(
				'Failed to sync payment method from checkout session:',
				error,
			)
		}
	}

	return orderId
}

function mapPaymentIntentStatus(
	status: Stripe.PaymentIntent.Status,
): 'paid' | 'pending' | 'failed' {
	if (status === 'succeeded') return 'paid'
	if (status === 'canceled') return 'failed'
	return 'pending'
}

async function getOrCreateShopStripeCustomer(
	tenantDb: Awaited<ReturnType<typeof getTenantDb>>,
	customerId: string,
) {
	const [customer] = await tenantDb
		.select({
			id: customers.id,
			stripeCustomerId: customers.stripeCustomerId,
			name: customers.name,
			email: customers.email,
			phone: customers.phone,
		})
		.from(customers)
		.where(eq(customers.id, customerId))
		.limit(1)

	if (!customer) {
		throw new Error('Customer not found')
	}

	if (customer.stripeCustomerId) {
		return customer.stripeCustomerId
	}

	const stripeCustomer = await withSafeStripe(() =>
		stripe.customers.create({
			name: customer.name,
			email: customer.email || undefined,
			phone: customer.phone || undefined,
			metadata: { tenantCustomerId: customer.id },
		}),
	)

	await tenantDb
		.update(customers)
		.set({
			stripeCustomerId: stripeCustomer.id,
			updatedAt: new Date(),
		})
		.where(eq(customers.id, customer.id))

	return stripeCustomer.id
}

async function attachPaymentMethodToStripeCustomer(
	stripeCustomerId: string,
	paymentMethodId: string,
) {
	try {
		await withSafeStripe(() =>
			stripe.paymentMethods.attach(paymentMethodId, {
				customer: stripeCustomerId,
			}),
		)
	} catch (error) {
		const code =
			error && typeof error === 'object' && 'code' in error
				? String((error as { code?: string }).code)
				: ''
		if (code === 'resource_already_exists') return
		throw error
	}
}

async function syncCustomerPaymentMethodsToStripe(
	tenantDb: Awaited<ReturnType<typeof getTenantDb>>,
	customerId: string,
	stripeCustomerId: string,
) {
	const methods = await tenantDb
		.select({
			stripePaymentMethodId: customerPaymentMethods.stripePaymentMethodId,
		})
		.from(customerPaymentMethods)
		.where(eq(customerPaymentMethods.customerId, customerId))

	for (const method of methods) {
		try {
			await attachPaymentMethodToStripeCustomer(
				stripeCustomerId,
				method.stripePaymentMethodId,
			)
		} catch (error) {
			console.error(
				'Failed to attach saved payment method to Stripe customer:',
				error,
			)
		}
	}
}

async function resolvePaymentMethodFromIntent(
	paymentIntent: Stripe.PaymentIntent,
): Promise<Stripe.PaymentMethod | null> {
	if (
		typeof paymentIntent.payment_method === 'object' &&
		paymentIntent.payment_method
	) {
		return paymentIntent.payment_method as Stripe.PaymentMethod
	}

	const paymentMethodId =
		typeof paymentIntent.payment_method === 'string'
			? paymentIntent.payment_method
			: null
	if (!paymentMethodId) return null

	return withSafeStripe(() => stripe.paymentMethods.retrieve(paymentMethodId))
}

async function recordCustomerPaymentMethod(
	tenantDb: Awaited<ReturnType<typeof getTenantDb>>,
	customerId: string,
	paymentMethod: Stripe.PaymentMethod,
) {
	if (!paymentMethod.card) return

	const values = {
		customerId,
		stripePaymentMethodId: paymentMethod.id,
		brand: paymentMethod.card.brand,
		last4: paymentMethod.card.last4,
		expMonth: paymentMethod.card.exp_month,
		expYear: paymentMethod.card.exp_year,
		updatedAt: new Date(),
	}

	const [existing] = await tenantDb
		.select({
			id: customerPaymentMethods.id,
			customerId: customerPaymentMethods.customerId,
		})
		.from(customerPaymentMethods)
		.where(eq(customerPaymentMethods.stripePaymentMethodId, paymentMethod.id))
		.limit(1)

	if (existing) {
		// First customer to save a Stripe PM id owns the tenant row; later customers
		// with the same PM (e.g. shared family card) are not re-linked.
		if (existing.customerId !== customerId) {
			console.warn(
				'Skipping payment method sync: card already saved for another customer',
			)
			return
		}
		await tenantDb
			.update(customerPaymentMethods)
			.set(values)
			.where(eq(customerPaymentMethods.id, existing.id))
	} else {
		await tenantDb.insert(customerPaymentMethods).values(values)
	}

	const [customer] = await tenantDb
		.select({ stripeCustomerId: customers.stripeCustomerId })
		.from(customers)
		.where(eq(customers.id, customerId))
		.limit(1)

	if (customer?.stripeCustomerId) {
		await attachPaymentMethodToStripeCustomer(
			customer.stripeCustomerId,
			paymentMethod.id,
		)
	}
}

async function syncCustomerPaymentMethodFromIntent(
	tenantDb: Awaited<ReturnType<typeof getTenantDb>>,
	customerId: string | null,
	paymentIntent: Stripe.PaymentIntent,
) {
	if (!customerId || paymentIntent.status !== 'succeeded') return

	try {
		const paymentMethod = await resolvePaymentMethodFromIntent(paymentIntent)
		if (paymentMethod) {
			await recordCustomerPaymentMethod(tenantDb, customerId, paymentMethod)
		}
	} catch (error) {
		console.error('Failed to record customer payment method:', error)
	}
}

export async function recordShopOrderFromPaymentIntent(
	paymentIntent: Stripe.PaymentIntent,
) {
	if (paymentIntent.metadata?.type !== 'shop_order') return null

	const orgId = paymentIntent.metadata.orgId
	if (!orgId) return null

	const amountCents = paymentIntent.amount
	if (amountCents == null) return null

	const { platformFeeCents, orgPayoutCents } = calculateShopFees(amountCents)
	const customerId = await resolveShopOrderCustomerId(
		orgId,
		paymentIntent.metadata.customerId || null,
	)
	const productName =
		paymentIntent.metadata.productName ||
		paymentIntent.metadata.product_name ||
		'Product'

	const tenantDb = await getTenantDb(orgId)
	const orderId = await upsertShopOrder(tenantDb, {
		customerId,
		productName,
		amountCents,
		platformFeeCents,
		orgPayoutCents,
		currency: paymentIntent.currency || 'usd',
		stripeCheckoutSessionId: null,
		stripePaymentIntentId: paymentIntent.id,
		status: mapPaymentIntentStatus(paymentIntent.status),
	})

	await syncCustomerPaymentMethodFromIntent(tenantDb, customerId, paymentIntent)

	return orderId
}

async function resolveShopOrderCustomerId(
	orgId: string,
	customerIdFromMetadata: string | null,
) {
	if (!customerIdFromMetadata) return null

	const tenantDb = await getTenantDb(orgId)
	const [customerRow] = await tenantDb
		.select({ id: customers.id })
		.from(customers)
		.where(eq(customers.id, customerIdFromMetadata))
		.limit(1)

	return customerRow?.id ?? null
}

type ShopOrderUpsertInput = {
	customerId: string | null
	productName: string
	amountCents: number
	platformFeeCents: number
	orgPayoutCents: number
	currency: string
	stripeCheckoutSessionId: string | null
	stripePaymentIntentId: string | null
	status: 'paid' | 'pending' | 'failed'
}

async function upsertShopOrder(
	tenantDb: Awaited<ReturnType<typeof getTenantDb>>,
	order: ShopOrderUpsertInput,
) {
	const updateSet = {
		status: order.status,
		customerId: order.customerId,
		stripeCheckoutSessionId: order.stripeCheckoutSessionId,
		stripePaymentIntentId: order.stripePaymentIntentId,
		updatedAt: new Date(),
	}

	const values = {
		customerId: order.customerId,
		productName: order.productName,
		amountCents: order.amountCents,
		platformFeeCents: order.platformFeeCents,
		orgPayoutCents: order.orgPayoutCents,
		currency: order.currency,
		stripeCheckoutSessionId: order.stripeCheckoutSessionId,
		stripePaymentIntentId: order.stripePaymentIntentId,
		status: order.status,
	}

	if (order.stripeCheckoutSessionId) {
		const [row] = await tenantDb
			.insert(shopOrders)
			.values(values)
			.onConflictDoUpdate({
				target: shopOrders.stripeCheckoutSessionId,
				set: updateSet,
			})
			.returning({ id: shopOrders.id })
		if (row?.id) return row.id
	}

	if (order.stripePaymentIntentId) {
		const [row] = await tenantDb
			.insert(shopOrders)
			.values(values)
			.onConflictDoUpdate({
				target: shopOrders.stripePaymentIntentId,
				set: updateSet,
			})
			.returning({ id: shopOrders.id })
		return row?.id ?? null
	}

	return null
}

export async function handleConnectAccountUpdated(account: Stripe.Account) {
	const organizationId = account.metadata?.organizationId
	if (!organizationId) return

	await db
		.update(OrganizationTable)
		.set({
			stripeConnectChargesEnabled: Boolean(account.charges_enabled),
			stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(OrganizationTable.id, organizationId),
				eq(OrganizationTable.stripeConnectAccountId, account.id),
			),
		)
}

export async function getPublicShopOrderStatus(options: {
	slug?: string | null
	host?: string | null
	sessionId?: string | null
	paymentIntentId?: string | null
}) {
	const organization = await findPublishedShopOrganization({
		slug: options.slug,
		host: options.host,
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	if (options.paymentIntentId) {
		const paymentIntent = await withSafeStripe(() =>
			stripe.paymentIntents.retrieve(options.paymentIntentId!, {
				expand: ['payment_method'],
			}),
		)

		if (paymentIntent.metadata?.orgId !== organization.id) {
			throw new Response('Order not found', { status: 404 })
		}

		if (
			paymentIntent.status === 'succeeded' &&
			paymentIntent.metadata?.type === 'shop_order'
		) {
			try {
				await recordShopOrderFromPaymentIntent(paymentIntent)
			} catch (error) {
				console.error('Failed to record shop order from payment intent:', error)
			}
		}

		return {
			status:
				paymentIntent.status === 'succeeded' ? 'paid' : paymentIntent.status,
			productName: paymentIntent.metadata.productName || 'Product',
			amountCents: paymentIntent.amount,
			currency: paymentIntent.currency || 'usd',
		}
	}

	if (!options.sessionId) {
		throw new Response('Order not found', { status: 404 })
	}

	const session = await withSafeStripe(() =>
		stripe.checkout.sessions.retrieve(options.sessionId!),
	)

	if (session.metadata?.orgId !== organization.id) {
		throw new Response('Order not found', { status: 404 })
	}

	if (
		session.payment_status === 'paid' &&
		session.metadata?.type === 'shop_order'
	) {
		try {
			await recordShopOrderFromCheckoutSession(session)
		} catch (error) {
			console.error('Failed to record shop order from checkout session:', error)
		}
	}

	return {
		status: session.payment_status,
		productName: session.metadata.productName || 'Product',
		amountCents: session.amount_total,
		currency: session.currency || 'usd',
	}
}
