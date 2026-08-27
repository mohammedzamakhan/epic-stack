/** Client-safe shop types and constants (no server imports). */

import {
	SHOP_PLATFORM_FEE_PERCENT,
	SHOP_PROCESSOR_CATALOG,
	calculateShopFees,
	getShopProcessorDefinition,
	mapOrganizationToShopSnapshot,
	normalizeShopProcessor,
	shopProcessorToDbValue,
	shopProcessorLabel,
	isShopAvailableForOrganization as isShopSnapshotAvailable,
	type ShopProcessorId,
	type ShopProcessorDefinition,
	type ShopCheckoutUi,
} from '@repo/payments/shop/client'

export {
	SHOP_PLATFORM_FEE_PERCENT,
	SHOP_PROCESSOR_CATALOG,
	calculateShopFees,
	getShopProcessorDefinition,
	normalizeShopProcessor,
	shopProcessorToDbValue,
	shopProcessorLabel,
	type ShopProcessorId,
	type ShopProcessorDefinition,
	type ShopCheckoutUi,
}

export function isShopAvailableForOrganization(organization: ShopOrganization) {
	return isShopSnapshotAvailable(mapOrganizationToShopSnapshot(organization))
}

export type ShopOrganization = {
	id: string
	name: string
	slug: string
	dataRegion: string | null
	hasProvisionedDb: boolean
	customDomain: string | null
	sitePublished: boolean
	shopPaymentProvider: ShopProcessorId
	stripeConnectAccountId: string | null
	stripeConnectChargesEnabled: boolean
	stripeConnectPayoutsEnabled: boolean
	checkoutSubEntityId: string | null
	checkoutChargesEnabled: boolean
	checkoutPayoutsEnabled: boolean
	polarProductId: string | null
	shopProductName: string | null
	shopProductDescription: string | null
	shopProductPriceCents: number | null
	shopEnabled: boolean
}

export type ShopOrderSummary = {
	id: string
	productName: string
	amountCents: number
	platformFeeCents: number
	orgPayoutCents: number
	currency: string
	status: string
	paymentProvider?: string | null
	createdAt: Date | null
	customerName?: string | null
	customerPhone?: string | null
	customerEmail?: string | null
}

/** @deprecated Use ShopProcessorId from @repo/payments */
export type ShopPaymentProvider = import('@repo/payments').ShopProcessorId
