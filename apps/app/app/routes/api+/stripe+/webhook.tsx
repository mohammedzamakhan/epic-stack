import { type ActionFunctionArgs } from 'react-router'
import type Stripe from 'stripe'
import {
	stripe,
	handleSubscriptionChange,
	handleTrialEnd,
} from '#app/utils/payments.server.ts'

/**
 * Helper function to process subscription events and extract the relevant data
 * for handleSubscriptionChange. Reduces code duplication across multiple event types.
 */
function processSubscriptionEvent(subscription: Stripe.Subscription) {
	return handleSubscriptionChange({
		id: subscription.id,
		status: subscription.status,
		customer: subscription.customer as string,
		items: subscription.items.data.map((item) => ({
			price: {
				id: item.price.id,
				product: item.price.product as string,
			},
		})),
	})
}

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 })
	}

	const payload = await request.text()
	const signature = request.headers.get('stripe-signature')

	if (!signature) {
		console.error('Missing Stripe signature')
		return new Response('Missing signature', { status: 400 })
	}

	let event: Stripe.Event

	try {
		event = stripe.webhooks.constructEvent(
			payload,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET!,
		)
	} catch (error) {
		console.error('Webhook signature verification failed:', error)
		return new Response('Invalid signature', { status: 400 })
	}

	try {
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription
				await processSubscriptionEvent(subscription)
				break
			}

			case 'customer.subscription.trial_will_end': {
				const subscription = event.data.object as Stripe.Subscription
				await handleTrialEnd({
					id: subscription.id,
					customer: subscription.customer as string,
					trial_end: subscription.trial_end,
				})
				break
			}

			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice
				console.log(`Payment succeeded for invoice: ${invoice.id}`)
				// You can add additional logic here for successful payments
				break
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice
				console.log(`Payment failed for invoice: ${invoice.id}`)
				// You can add additional logic here for failed payments
				// Such as sending notifications to admins
				break
			}

			case 'customer.subscription.paused': {
				const subscription = event.data.object as Stripe.Subscription
				await processSubscriptionEvent(subscription)
				break
			}

			case 'customer.subscription.resumed': {
				const subscription = event.data.object as Stripe.Subscription
				await processSubscriptionEvent(subscription)
				break
			}

			default: {
				console.log(`Unhandled webhook event type: ${event.type}`)
			}
		}

		return new Response('Webhook processed successfully', { status: 200 })
	} catch (error) {
		console.error(`Error processing webhook ${event.type}:`, error)
		return new Response('Webhook processing failed', { status: 500 })
	}
}
