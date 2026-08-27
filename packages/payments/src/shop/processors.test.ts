import { describe, expect, it } from 'vitest'
import {
	isShopAvailableForOrganization,
	mapOrganizationToShopSnapshot,
	normalizeShopProcessor,
} from './processors'
import { type ShopOrganizationSnapshot } from './types'

function org(
	overrides: Partial<ShopOrganizationSnapshot> = {},
): ShopOrganizationSnapshot {
	return {
		dataRegion: 'us',
		shopPaymentProvider: 'stripe',
		shopEnabled: true,
		shopProductName: 'Starter pack',
		shopProductDescription: null,
		shopProductPriceCents: 1999,
		connectAccountId: 'acct_123',
		connectChargesEnabled: true,
		connectPayoutsEnabled: false,
		hostedProductId: null,
		checkoutSubEntityId: null,
		checkoutChargesEnabled: false,
		checkoutPayoutsEnabled: false,
		...overrides,
	}
}

describe('normalizeShopProcessor', () => {
	it('defaults unknown values to connect', () => {
		expect(normalizeShopProcessor(null)).toBe('connect')
		expect(normalizeShopProcessor('paypal')).toBe('connect')
		expect(normalizeShopProcessor('polar')).toBe('mor')
		expect(normalizeShopProcessor('checkout')).toBe('checkout')
		expect(normalizeShopProcessor('stripe')).toBe('connect')
	})
})

describe('isShopAvailableForOrganization', () => {
	it('requires a configured product', () => {
		expect(
			isShopAvailableForOrganization(
				org({ shopEnabled: false, shopProductName: null }),
			),
		).toBe(false)
	})

	it('is US-only', () => {
		expect(isShopAvailableForOrganization(org({ dataRegion: 'ksa' }))).toBe(
			false,
		)
	})

	it('requires connect charges for connect shops', () => {
		expect(
			isShopAvailableForOrganization(org({ connectChargesEnabled: false })),
		).toBe(false)
	})

	it('requires a hosted product for MoR shops', () => {
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'polar',
					hostedProductId: null,
				}),
			),
		).toBe(false)
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'polar',
					hostedProductId: 'prod_hosted',
					connectChargesEnabled: false,
					connectAccountId: null,
				}),
			),
		).toBe(true)
	})

	it('requires a Checkout.com sub-entity for checkout shops', () => {
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'checkout',
					checkoutSubEntityId: null,
				}),
			),
		).toBe(false)
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'checkout',
					checkoutSubEntityId: 'ent_123',
					checkoutChargesEnabled: true,
				}),
			),
		).toBe(true)
	})
})

describe('mapOrganizationToShopSnapshot', () => {
	it('maps control-plane columns to generic shop snapshot fields', () => {
		expect(
			mapOrganizationToShopSnapshot({
				dataRegion: 'us',
				shopPaymentProvider: 'polar',
				shopEnabled: true,
				shopProductName: 'Pack',
				shopProductDescription: 'Desc',
				shopProductPriceCents: 1000,
				stripeConnectAccountId: 'acct_1',
				stripeConnectChargesEnabled: true,
				stripeConnectPayoutsEnabled: true,
				polarProductId: 'prod_1',
				checkoutSubEntityId: 'ent_1',
				checkoutChargesEnabled: true,
				checkoutPayoutsEnabled: true,
			}),
		).toEqual({
			dataRegion: 'us',
			shopPaymentProvider: 'polar',
			shopEnabled: true,
			shopProductName: 'Pack',
			shopProductDescription: 'Desc',
			shopProductPriceCents: 1000,
			connectAccountId: 'acct_1',
			connectChargesEnabled: true,
			connectPayoutsEnabled: true,
			hostedProductId: 'prod_1',
			checkoutSubEntityId: 'ent_1',
			checkoutChargesEnabled: true,
			checkoutPayoutsEnabled: true,
		})
	})
})
