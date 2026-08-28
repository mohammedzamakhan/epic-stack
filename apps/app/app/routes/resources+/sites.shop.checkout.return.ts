import { type LoaderFunctionArgs, redirect } from 'react-router'
import {
	findPublishedShopOrganization,
	getSiteBaseUrl,
} from '#app/utils/shop.server.ts'

/**
 * Checkout.com redirects here after hosted payment. We forward CKO query params
 * to the tenant site's success page so order details can be loaded.
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const slug = url.searchParams.get('slug')
	const host = url.searchParams.get('host')

	const organization = await findPublishedShopOrganization({ slug, host })
	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const successUrl = new URL(`${getSiteBaseUrl(organization)}/shop/success`)

	const checkoutPaymentId =
		url.searchParams.get('cko-payment-id') ||
		url.searchParams.get('cko_payment_id')
	const checkoutSessionId =
		url.searchParams.get('cko-session-id') ||
		url.searchParams.get('cko_session_id')

	if (checkoutPaymentId) {
		successUrl.searchParams.set('cko-payment-id', checkoutPaymentId)
	}
	if (checkoutSessionId) {
		successUrl.searchParams.set('cko-session-id', checkoutSessionId)
	}

	return redirect(successUrl.toString())
}
