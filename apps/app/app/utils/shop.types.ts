/** Client-safe shop types and constants (no server imports). */

export const SHOP_PLATFORM_FEE_PERCENT = 20

export type ShopOrganization = {
	id: string
	name: string
	slug: string
	dataRegion: string | null
	hasProvisionedDb: boolean
	customDomain: string | null
	sitePublished: boolean
	stripeConnectAccountId: string | null
	stripeConnectChargesEnabled: boolean
	stripeConnectPayoutsEnabled: boolean
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
	createdAt: Date | null
	customerName?: string | null
	customerPhone?: string | null
	customerEmail?: string | null
}
