import {
	type ShopOrganizationSnapshot,
	type ShopProcessorDbValue,
	type ShopProcessorDefinition,
	type ShopProcessorId,
} from './types'

export const SHOP_PROCESSOR_CATALOG: readonly ShopProcessorDefinition[] = [
	{
		id: 'connect',
		label: 'Marketplace payouts',
		shortLabel: 'Connect',
		checkoutDescription:
			'Automatic split payouts: you receive your share after the platform fee.',
		dbValue: 'stripe',
		supportsInlineCard: true,
		supportsHostedEmbed: false,
		supportsConnectOnboarding: true,
		supportsAutomaticPayoutSplit: true,
	},
	{
		id: 'mor',
		label: 'Hosted checkout',
		shortLabel: 'MoR',
		checkoutDescription:
			'Merchant-of-record checkout: your share is recorded on each order for platform settlement.',
		dbValue: 'polar',
		supportsInlineCard: false,
		supportsHostedEmbed: true,
		supportsConnectOnboarding: false,
		supportsAutomaticPayoutSplit: false,
	},
	{
		id: 'checkout',
		label: 'Checkout.com payouts',
		shortLabel: 'Checkout',
		checkoutDescription:
			'Marketplace split payouts via Checkout.com sub-entities with automatic platform commission.',
		dbValue: 'checkout',
		supportsInlineCard: false,
		supportsHostedEmbed: false,
		supportsConnectOnboarding: true,
		supportsAutomaticPayoutSplit: true,
	},
] as const

const PROCESSOR_BY_ID = new Map(
	SHOP_PROCESSOR_CATALOG.map((processor) => [processor.id, processor]),
)

const PROCESSOR_BY_DB_VALUE = new Map(
	SHOP_PROCESSOR_CATALOG.map((processor) => [processor.dbValue, processor]),
)

export function getShopProcessorDefinition(
	id: ShopProcessorId,
): ShopProcessorDefinition {
	const processor = PROCESSOR_BY_ID.get(id)
	if (!processor) {
		throw new Error(`Unknown shop processor: ${id}`)
	}
	return processor
}

export function normalizeShopProcessor(
	value: string | null | undefined,
): ShopProcessorId {
	if (value === 'connect' || value === 'mor' || value === 'checkout')
		return value
	const processor = PROCESSOR_BY_DB_VALUE.get(value as ShopProcessorDbValue)
	return processor?.id ?? 'connect'
}

export function shopProcessorToDbValue(
	processor: ShopProcessorId,
): ShopProcessorDbValue {
	return getShopProcessorDefinition(processor).dbValue
}

export function shopProcessorLabel(processor: ShopProcessorId) {
	return getShopProcessorDefinition(processor).label
}

export function isShopProductConfigured(
	organization: Pick<
		ShopOrganizationSnapshot,
		'shopEnabled' | 'shopProductName' | 'shopProductPriceCents' | 'dataRegion'
	>,
) {
	return (
		organization.shopEnabled &&
		Boolean(organization.shopProductName?.trim()) &&
		typeof organization.shopProductPriceCents === 'number' &&
		organization.shopProductPriceCents >= 50 &&
		(organization.dataRegion || 'us') === 'us'
	)
}

export function isShopProcessorReady(
	organization: ShopOrganizationSnapshot,
	processor: ShopProcessorId = normalizeShopProcessor(
		organization.shopPaymentProvider,
	),
) {
	if (!isShopProductConfigured(organization)) return false

	if (processor === 'mor') {
		return Boolean(organization.hostedProductId)
	}

	if (processor === 'checkout') {
		return (
			Boolean(organization.checkoutSubEntityId) &&
			organization.checkoutChargesEnabled
		)
	}

	return (
		Boolean(organization.connectAccountId) && organization.connectChargesEnabled
	)
}

export function isShopAvailableForOrganization(
	organization: ShopOrganizationSnapshot,
) {
	return isShopProcessorReady(
		organization,
		normalizeShopProcessor(organization.shopPaymentProvider),
	)
}

export function mapOrganizationToShopSnapshot(organization: {
	dataRegion: string | null
	shopPaymentProvider: string | null
	shopEnabled: boolean
	shopProductName: string | null
	shopProductDescription: string | null
	shopProductPriceCents: number | null
	stripeConnectAccountId: string | null
	stripeConnectChargesEnabled: boolean
	stripeConnectPayoutsEnabled: boolean
	polarProductId: string | null
	checkoutSubEntityId: string | null
	checkoutChargesEnabled: boolean
	checkoutPayoutsEnabled: boolean
}): ShopOrganizationSnapshot {
	return {
		dataRegion: organization.dataRegion,
		shopPaymentProvider: organization.shopPaymentProvider,
		shopEnabled: organization.shopEnabled,
		shopProductName: organization.shopProductName,
		shopProductDescription: organization.shopProductDescription,
		shopProductPriceCents: organization.shopProductPriceCents,
		connectAccountId: organization.stripeConnectAccountId,
		connectChargesEnabled: organization.stripeConnectChargesEnabled,
		connectPayoutsEnabled: organization.stripeConnectPayoutsEnabled,
		hostedProductId: organization.polarProductId,
		checkoutSubEntityId: organization.checkoutSubEntityId,
		checkoutChargesEnabled: organization.checkoutChargesEnabled,
		checkoutPayoutsEnabled: organization.checkoutPayoutsEnabled,
	}
}
