import { describe, expect, it } from 'vitest'
import {
	getShopPaymentMode,
	isInlineShopCheckoutEnabled,
	resolveShopPaymentMode,
} from './shop.ts'

describe('shop payment mode', () => {
	it('defaults to redirect', () => {
		expect(getShopPaymentMode()).toBe('redirect')
		expect(resolveShopPaymentMode()).toBe('redirect')
		expect(isInlineShopCheckoutEnabled()).toBe(false)
	})

	it('enables inline card checkout when mode is inline', () => {
		const previousMode = process.env.PUBLIC_SHOP_PAYMENT_MODE
		process.env.PUBLIC_SHOP_PAYMENT_MODE = 'inline'

		expect(getShopPaymentMode()).toBe('inline')
		expect(isInlineShopCheckoutEnabled()).toBe(true)

		process.env.PUBLIC_SHOP_PAYMENT_MODE = previousMode
	})
})
