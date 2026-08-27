import {
	checkoutWebhookSignatureFromRequest,
	verifyCheckoutWebhookEvent,
} from '../connect/checkout-shop'
import { polarWebhookHeadersFromRequest } from '../connect/polar-shop'
import { type ShopCommerce } from './commerce'
import {
	type ShopCheckoutWebhookEvent,
	type ShopMorWebhookEvent,
} from './types'

export function hostedWebhookHeadersFromRequest(request: Request) {
	return polarWebhookHeadersFromRequest(request)
}

export function parseHostedShopWebhook(
	commerce: ShopCommerce,
	payload: string,
	headers: Record<string, string>,
): ShopMorWebhookEvent | null {
	const event = commerce.verifyHostedWebhook(payload, headers)
	return commerce.parseHostedWebhookEvent(event)
}

export function parseCheckoutShopWebhook(
	commerce: ShopCommerce,
	payload: string,
	signature: string,
): ShopCheckoutWebhookEvent | null {
	const event = commerce.verifyCheckoutWebhook(payload, signature)
	return commerce.parseCheckoutWebhookEvent(event)
}

export { checkoutWebhookSignatureFromRequest, verifyCheckoutWebhookEvent }
