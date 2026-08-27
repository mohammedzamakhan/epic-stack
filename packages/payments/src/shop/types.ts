/**
 * Platform-agnostic tenant shop commerce types.
 * Provider-specific details stay inside @repo/payments adapters.
 */

export const SHOP_ORDER_METADATA_TYPE = 'shop_order' as const

export type ShopProcessorId = 'connect' | 'mor' | 'checkout'
export type ShopProcessorDbValue = 'stripe' | 'polar' | 'checkout'

export type ShopOrderStatus = 'paid' | 'pending' | 'failed'

export type ShopCheckoutUi = 'redirect' | 'inline-card' | 'hosted-embed'

export type ShopOrganizationSnapshot = {
	dataRegion: string | null
	shopPaymentProvider: string | null
	shopEnabled: boolean
	shopProductName: string | null
	shopProductDescription: string | null
	shopProductPriceCents: number | null
	connectAccountId: string | null
	connectChargesEnabled: boolean
	connectPayoutsEnabled: boolean
	hostedProductId: string | null
	checkoutSubEntityId: string | null
	checkoutChargesEnabled: boolean
	checkoutPayoutsEnabled: boolean
}

export type ShopPublicProduct = {
	name: string
	description: string | null
	priceCents: number
	currency: string
	processor: ShopProcessorId
	platformFeePercent: number
	platformFeeCents: number
	orgPayoutCents: number
}

export type ShopCheckoutSession = {
	id: string
	url: string
	processor: ShopProcessorId
}

export type ShopInlinePayment = {
	clientSecret: string
	paymentId: string
	publishableKey: string
	processor: ShopProcessorId
}

export type ShopOrderSnapshot = {
	status: ShopOrderStatus | string
	productName: string
	amountCents: number | null
	currency: string
}

export type ShopOrderUpsert = {
	orgId: string
	customerIdFromMetadata: string | null
	productName: string
	amountCents: number
	platformFeeCents: number
	orgPayoutCents: number
	currency: string
	processor: ShopProcessorId
	processorCheckoutId: string | null
	processorPaymentId: string | null
	processorOrderId: string | null
	status: ShopOrderStatus
}

export type ShopConnectAccountUpdate = {
	organizationId: string
	accountId: string
	chargesEnabled: boolean
	payoutsEnabled: boolean
}

export type ShopProcessorDefinition = {
	id: ShopProcessorId
	label: string
	shortLabel: string
	checkoutDescription: string
	dbValue: ShopProcessorDbValue
	supportsInlineCard: boolean
	supportsHostedEmbed: boolean
	supportsConnectOnboarding: boolean
	supportsAutomaticPayoutSplit: boolean
}

export type ShopMorWebhookEvent =
	| { type: 'order'; order: ShopOrderUpsert }
	| { type: 'checkout'; order: ShopOrderUpsert }

export type ShopCheckoutWebhookEvent = {
	type: 'payment'
	order: ShopOrderUpsert
}
