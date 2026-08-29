import type Stripe from 'stripe'

/** Auto-refund duplicate subscriptions created within this window (ms). */
const DUPLICATE_REFUND_WINDOW_MS = 30 * 60 * 1000

export interface DuplicateSubscriptionCleanupResult {
	keptSubscriptionId: string | null
	cancelledSubscriptionIds: string[]
	refundedSubscriptionIds: string[]
}

/**
 * When a customer ends up with multiple active/trialing subscriptions (e.g. from
 * spam-clicking checkout), keep the newest and cancel the rest. Refunds recent
 * duplicate payments automatically.
 */
export async function cleanupDuplicateSubscriptions(
	stripe: Stripe,
	customerId: string,
): Promise<DuplicateSubscriptionCleanupResult> {
	const result: DuplicateSubscriptionCleanupResult = {
		keptSubscriptionId: null,
		cancelledSubscriptionIds: [],
		refundedSubscriptionIds: [],
	}

	const subscriptions = await stripe.subscriptions.list({
		customer: customerId,
		status: 'all',
	})

	const billableSubscriptions = subscriptions.data.filter(
		(sub) => sub.status === 'active' || sub.status === 'trialing',
	)

	if (billableSubscriptions.length <= 1) {
		result.keptSubscriptionId = billableSubscriptions[0]?.id ?? null
		return result
	}

	const sortedSubscriptions = [...billableSubscriptions].sort(
		(a, b) => b.created - a.created,
	)

	const [keepSubscription, ...cancelSubscriptions] = sortedSubscriptions
	result.keptSubscriptionId = keepSubscription?.id ?? null

	for (const sub of cancelSubscriptions) {
		const refunded = await refundRecentSubscriptionPayment(stripe, sub.id)
		if (refunded) {
			result.refundedSubscriptionIds.push(sub.id)
		}

		await stripe.subscriptions.cancel(sub.id)
		result.cancelledSubscriptionIds.push(sub.id)
	}

	return result
}

async function refundRecentSubscriptionPayment(
	stripe: Stripe,
	subscriptionId: string,
): Promise<boolean> {
	try {
		const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
			expand: ['latest_invoice'],
		})

		const createdAt = subscription.created * 1000
		if (Date.now() - createdAt > DUPLICATE_REFUND_WINDOW_MS) {
			return false
		}

		const latestInvoice = subscription.latest_invoice
		if (!latestInvoice || typeof latestInvoice === 'string') {
			return false
		}

		if (latestInvoice.status !== 'paid') {
			return false
		}

		const expandedInvoice = latestInvoice as Stripe.Invoice & {
			payment_intent?: Stripe.PaymentIntent | string | null
			charge?: string | null
		}

		const paymentIntent = expandedInvoice.payment_intent
		if (paymentIntent && typeof paymentIntent !== 'string') {
			await stripe.refunds.create({ payment_intent: paymentIntent.id })
			return true
		}

		if (expandedInvoice.charge && typeof expandedInvoice.charge === 'string') {
			await stripe.refunds.create({ charge: expandedInvoice.charge })
			return true
		}

		return false
	} catch (error) {
		console.error(
			`Failed to refund duplicate subscription ${subscriptionId}:`,
			error,
		)
		return false
	}
}
