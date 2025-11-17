import type { ActionFunctionArgs } from 'react-router'
import type Stripe from 'stripe'

export interface StripeWebhookDependencies {
	stripe: Stripe
	handleSubscriptionChange: (params: {
		id: string
		status: Stripe.Subscription.Status
		customer: string
		items: Array<{
			price: {
				id: string
				product: string
			}
		}>
	}) => Promise<void>
	handleTrialEnd: (params: {
		id: string
		customer: string
		trial_end: number | null
	}) => Promise<void>
	webhookSecret: string
}

/**
 * Shared Stripe webhook handler for processing subscription events.
 * This handler is used by both the admin and app applications.
 *
 * @param request - The incoming request
 * @param deps - Dependencies (stripe client, handlers, webhook secret)
 * @returns Response indicating success or failure
 */
export async function handleStripeWebhook(
	{ request }: ActionFunctionArgs,
	deps: StripeWebhookDependencies,
) {
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
		event = deps.stripe.webhooks.constructEvent(
			payload,
			signature,
			deps.webhookSecret,
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
				await deps.handleSubscriptionChange({
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
				break
			}

			case 'customer.subscription.trial_will_end': {
				const subscription = event.data.object as Stripe.Subscription
				await deps.handleTrialEnd({
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
				await deps.handleSubscriptionChange({
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
				break
			}

			case 'customer.subscription.resumed': {
				const subscription = event.data.object as Stripe.Subscription
				await deps.handleSubscriptionChange({
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
