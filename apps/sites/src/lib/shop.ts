import { ENV } from 'varlock/env'

export type ShopPaymentMode = 'redirect' | 'inline'

function readEnv(key: 'PUBLIC_SHOP_PAYMENT_MODE') {
	if (process.env[key]) return process.env[key]
	try {
		return ENV[key]
	} catch {
		return undefined
	}
}

export function getShopPaymentMode(): ShopPaymentMode {
	const raw = readEnv('PUBLIC_SHOP_PAYMENT_MODE') || 'redirect'
	return raw === 'inline' ? 'inline' : 'redirect'
}

/** Inline card checkout needs extra script/connect CSP allowances. */
export function isInlineShopCheckoutEnabled() {
	return getShopPaymentMode() === 'inline'
}

export function resolveShopPaymentMode(): ShopPaymentMode {
	return getShopPaymentMode()
}
