import { type LoaderFunctionArgs, redirect } from 'react-router'
import type Stripe from 'stripe'
import { prisma } from '#app/utils/db.server.ts'
import { stripe } from '#app/utils/payments.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const sessionId = url.searchParams.get('session_id')
	const organizationId = url.searchParams.get('organizationId')
	if (!sessionId) {
		return redirect('/pricing')
	}

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['customer', 'subscription'],
		})

		if (!session.customer || typeof session.customer === 'string') {
			throw new Error('Invalid customer data from Stripe.')
		}

		const customerId = session.customer.id
		const subscriptionId =
			typeof session.subscription === 'string'
				? session.subscription
				: session.subscription?.id

		if (!subscriptionId) {
			throw new Error('No subscription found for this session.')
		}

		const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
			expand: ['items.data.price.product'],
		})

		const plan = subscription.items.data[0]?.price

		if (!plan) {
			throw new Error('No plan found for this subscription.')
		}

		const productId = (plan.product as Stripe.Product).id

		if (!productId) {
			throw new Error('No product ID found for this subscription.')
		}

		const userId = session.client_reference_id
		if (!userId) {
			throw new Error("No user ID found in session's client_reference_id.")
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: { organizations: { select: { organizationId: true } } },
		})

		if (!user) {
			throw new Error('User not found in database.')
		}

		if (user.organizations.length === 0) {
			throw new Error('User is not associated with any tenant.')
		}

		if (!organizationId) {
			throw new Error('Tenant not found in database.')
		}

		const tenant = await prisma.organization.update({
			where: { id: organizationId },
			data: {
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscriptionId,
				stripeProductId: productId,
				planName: (plan.product as Stripe.Product).name,
				subscriptionStatus: subscription.status,
				updatedAt: new Date(),
			},
			select: {
				slug: true,
			},
		})

		// You might want to set some session data here if needed
		// For example, you could use the authSessionStorage from your auth.server.ts

		return redirect(`/${tenant.slug}/dashboard`)
	} catch (error) {
		console.error('Error handling successful checkout:', error)
		return redirect('/error')
	}
}

export default function CheckoutPage() {
	return <div>Checkout</div>
}
