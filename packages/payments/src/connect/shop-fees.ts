/**
 * Shared marketplace fee math for tenant site commerce.
 * Used by Stripe Connect destination charges and Polar shop checkout.
 */

export const SHOP_PLATFORM_FEE_PERCENT = 20

export function calculateShopFees(amountCents: number) {
	const platformFeeCents = Math.round(
		amountCents * (SHOP_PLATFORM_FEE_PERCENT / 100),
	)
	const orgPayoutCents = amountCents - platformFeeCents
	return { platformFeeCents, orgPayoutCents, amountCents }
}
