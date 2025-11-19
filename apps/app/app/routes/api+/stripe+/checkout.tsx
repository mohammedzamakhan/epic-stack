import { handleStripeCheckout } from '@repo/payments'
import { type LoaderFunctionArgs } from 'react-router'
import { prisma } from '#app/utils/db.server.ts'
import { stripe } from '#app/utils/payments.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleStripeCheckout(args, {
		stripe,
		prisma,
	})
}

export default function CheckoutPage() {
	return <div>Checkout</div>
}
