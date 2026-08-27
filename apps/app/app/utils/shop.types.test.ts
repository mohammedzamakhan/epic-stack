import { describe, expect, it } from 'vitest'
import {
	isShopAvailableForOrganization,
	normalizeShopProcessor,
	type ShopOrganization,
} from './shop.types.ts'

function org(overrides: Partial<ShopOrganization> = {}): ShopOrganization {
	return {
		id: 'org_1',
		name: 'Acme',
		slug: 'acme',
		dataRegion: 'us',
		hasProvisionedDb: true,
		customDomain: null,
		sitePublished: true,
		shopPaymentProvider: 'connect',
		stripeConnectAccountId: 'acct_123',
		stripeConnectChargesEnabled: true,
		stripeConnectPayoutsEnabled: false,
		polarProductId: null,
		checkoutSubEntityId: null,
		checkoutChargesEnabled: false,
		checkoutPayoutsEnabled: false,
		shopProductName: 'Starter pack',
		shopProductDescription: null,
		shopProductPriceCents: 1999,
		shopEnabled: true,
		...overrides,
	}
}

describe('normalizeShopProcessor', () => {
	it('defaults unknown values to connect', () => {
		expect(normalizeShopProcessor(null)).toBe('connect')
		expect(normalizeShopProcessor('paypal')).toBe('connect')
		expect(normalizeShopProcessor('polar')).toBe('mor')
		expect(normalizeShopProcessor('connect')).toBe('connect')
	})
})

describe('isShopAvailableForOrganization', () => {
	it('requires connect charges for connect shops', () => {
		expect(
			isShopAvailableForOrganization(
				org({ stripeConnectChargesEnabled: false }),
			),
		).toBe(false)
	})

	it('requires a hosted product for MoR shops', () => {
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'mor',
					polarProductId: null,
				}),
			),
		).toBe(false)
		expect(
			isShopAvailableForOrganization(
				org({
					shopPaymentProvider: 'mor',
					polarProductId: 'prod_hosted',
					stripeConnectChargesEnabled: false,
					stripeConnectAccountId: null,
				}),
			),
		).toBe(true)
	})
})
