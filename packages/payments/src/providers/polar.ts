/**
 * Polar Payment Provider Implementation
 *
 * Note: Polar's SDK is more limited than Stripe. Some methods may not be fully supported
 * and will need to be called directly using the Polar client for advanced features.
 */

import { Polar } from '@polar-sh/sdk'
import type {
	PaymentProvider,
	Product,
	Price,
	PlansAndPrices,
	CheckoutSession,
	CheckoutSessionOptions,
	Subscription,
	SubscriptionUpdateOptions,
	CustomerPortalSession,
	CustomerPortalOptions,
	Invoice,
	WebhookEvent,
} from '../types'

export class PolarProvider implements PaymentProvider {
	private polar: Polar
	private organizationId?: string

	constructor(config: { apiKey: string; organizationId?: string }) {
		if (!config.apiKey) {
			throw new Error('Polar access token is required')
		}

		this.polar = new Polar({
			accessToken: config.apiKey,
		})

		this.organizationId = config.organizationId
	}

	/**
	 * Get the underlying Polar instance (for advanced usage)
	 */
	getClient(): Polar {
		return this.polar
	}

	/**
	 * Set the organization ID for subsequent API calls
	 */
	setOrganizationId(organizationId: string): void {
		this.organizationId = organizationId
	}

	private ensureOrganizationId(): string {
		if (!this.organizationId) {
			throw new Error(
				'Organization ID is required for this operation. Set it via setOrganizationId() or pass it in the constructor.',
			)
		}
		return this.organizationId
	}

	async getProducts(): Promise<Product[]> {
		try {
			const orgId = this.ensureOrganizationId()

			const productsIterator = await this.polar.products.list({
				organizationId: orgId,
				isArchived: false,
				limit: 100,
			})

				const products: Product[] = []
			for await (const page of productsIterator) {
				const result = page.result
				if (result.items) {
					for (const product of result.items) {
						products.push({
							id: product.id,
							name: product.name,
							description: product.description || null,
							defaultPriceId: product.prices?.[0]?.id,
						})
					}
				}
			}

			return products
		} catch (error: any) {
			console.error('PolarProvider: Failed to fetch products:', error)
			throw new Error(
				`Failed to fetch Polar products: ${error?.message || error}`,
			)
		}
	}

	async getPrices(): Promise<Price[]> {
		try {
			const orgId = this.ensureOrganizationId()

			const productsIterator = await this.polar.products.list({
				organizationId: orgId,
				isArchived: false,
				limit: 100,
			})

			const prices: Price[] = []

			for await (const page of productsIterator) {
				const result = page.result
				if (result.items) {
					for (const product of result.items) {
						if (product.prices && product.prices.length > 0) {
							for (const price of product.prices) {
								// Map Polar's price interval types to our standard types
								let interval: 'month' | 'year' | 'week' | 'day' | null = null
								if (price.type === 'recurring' && price.recurringInterval) {
									if (
										price.recurringInterval === 'month' ||
										price.recurringInterval === 'year'
									) {
										interval = price.recurringInterval
									}
								}

								prices.push({
									id: price.id,
									productId: product.id,
									unitAmount: price.priceAmount || null,
									interval,
									trialPeriodDays: null,
									currency: price.priceCurrency?.toLowerCase() || 'usd',
								})
							}
						}
					}
				}
			}

			return prices
		} catch (error: any) {
			console.error('PolarProvider: Failed to fetch prices:', error)
			throw new Error(`Failed to fetch Polar prices: ${error?.message || error}`)
		}
	}

	async getPlansAndPrices(): Promise<PlansAndPrices> {
		try {
			const products = await this.getProducts()
			const prices = await this.getPrices()

			const basePlan = products.find((product) => product.name === 'Base')
			const plusPlan = products.find((product) => product.name === 'Plus')

			// Filter for monthly and yearly prices
			const monthlyPrices = prices.filter(
				(price) => price.interval === 'month' && price.currency === 'usd',
			)
			const yearlyPrices = prices.filter(
				(price) => price.interval === 'year' && price.currency === 'usd',
			)

			// Find prices for each plan and interval
			const basePriceMonthly = monthlyPrices.find(
				(price) => price.productId === basePlan?.id,
			)
			const basePriceYearly = yearlyPrices.find(
				(price) => price.productId === basePlan?.id,
			)
			const plusPriceMonthly = monthlyPrices.find(
				(price) => price.productId === plusPlan?.id,
			)
			const plusPriceYearly = yearlyPrices.find(
				(price) => price.productId === plusPlan?.id,
			)

			return {
				plans: { base: basePlan, plus: plusPlan },
				prices: {
					base: {
						monthly: basePriceMonthly,
						yearly: basePriceYearly,
					},
					plus: {
						monthly: plusPriceMonthly,
						yearly: plusPriceYearly,
					},
				},
			}
		} catch (error) {
			console.error('PolarProvider: Error in getPlansAndPrices:', error)

			// Return fallback data to prevent the app from hanging
			return {
				plans: { base: undefined, plus: undefined },
				prices: {
					base: { monthly: undefined, yearly: undefined },
					plus: { monthly: undefined, yearly: undefined },
				},
			}
		}
	}

	async createCheckoutSession(
		options: CheckoutSessionOptions,
	): Promise<CheckoutSession> {
		try {
			const checkoutData: any = {
				productPriceId: options.priceId,
				successUrl: options.successUrl,
			}

			const checkout = await this.polar.checkouts.create(checkoutData)

			return {
				id: checkout.id,
				url: checkout.url || '',
				customerId: undefined, // Polar checkouts don't include customer ID in response
				subscriptionId: undefined,
			}
		} catch (error: any) {
			console.error('PolarProvider: Failed to create checkout session:', error)
			throw new Error(
				`Failed to create Polar checkout: ${error?.message || error}`,
			)
		}
	}

	async retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession> {
		try {
			const checkout = await this.polar.checkouts.get({ id: sessionId })

			return {
				id: checkout.id,
				url: checkout.url || '',
				customerId: undefined, // Polar checkouts don't include customer ID in response
				subscriptionId: undefined, // Polar checkouts don't include subscription ID in response
			}
		} catch (error: any) {
			console.error('PolarProvider: Failed to retrieve checkout session:', error)
			throw new Error(
				`Failed to retrieve Polar checkout: ${error?.message || error}`,
			)
		}
	}

	async retrieveSubscription(subscriptionId: string): Promise<Subscription> {
		// Polar SDK doesn't have a direct get subscription by ID method
		// We need to list subscriptions and find the one we want
		throw new Error(
			'Polar SDK does not support retrieving individual subscriptions by ID directly. Use listSubscriptions() instead or access the Polar client directly.',
		)
	}

	async listSubscriptions(customerId: string): Promise<Subscription[]> {
		try {
			const orgId = this.ensureOrganizationId()

			const subscriptionsIterator = await this.polar.subscriptions.list({
				organizationId: orgId,
				limit: 100,
			})

			const subscriptions: Subscription[] = []

			for await (const page of subscriptionsIterator) {
				const result = page.result
				if (result.items) {
					for (const sub of result.items) {
						// Filter by customerId if provided
						if (customerId && sub.userId !== customerId) {
							continue
						}

						// Map Polar subscription status to our standard status
						let status: Subscription['status'] = 'active'
						if (sub.status === 'active') status = 'active'
						else if (sub.status === 'canceled') status = 'canceled'
						else if (sub.status === 'incomplete') status = 'unpaid'
						else if (sub.status === 'incomplete_expired') status = 'unpaid'
						else if (sub.status === 'past_due') status = 'past_due'
						else if (sub.status === 'unpaid') status = 'unpaid'

						subscriptions.push({
							id: sub.id,
							status,
							customerId: sub.userId || '',
							productId: sub.productId,
							priceId: sub.priceId || '',
							trialEnd: sub.currentPeriodEnd
								? new Date(sub.currentPeriodEnd)
								: null,
							currentPeriodEnd: sub.currentPeriodEnd
								? new Date(sub.currentPeriodEnd)
								: undefined,
							cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
							quantity: 1,
							items: [
								{
									id: sub.id,
									priceId: sub.priceId || '',
									quantity: 1,
								},
							],
						})
					}
				}
			}

			return subscriptions
		} catch (error: any) {
			console.error('PolarProvider: Failed to list subscriptions:', error)
			throw new Error(
				`Failed to list Polar subscriptions: ${error?.message || error}`,
			)
		}
	}

	async updateSubscription(
		options: SubscriptionUpdateOptions,
	): Promise<Subscription> {
		// Polar SDK doesn't expose subscription update methods
		throw new Error(
			'Polar SDK does not support updating subscriptions through the standard API. Use the Polar client directly for advanced subscription management.',
		)
	}

	async cancelSubscription(subscriptionId: string): Promise<Subscription> {
		// Polar SDK doesn't expose subscription cancel methods
		throw new Error(
			'Polar SDK does not support canceling subscriptions through the standard API. Use the Polar client directly for subscription management.',
		)
	}

	async createCustomerPortalSession(
		options: CustomerPortalOptions,
	): Promise<CustomerPortalSession> {
		// Polar doesn't have a direct customer portal API like Stripe
		// Return a placeholder or throw an error
		throw new Error(
			'Polar does not have a customer portal session API like Stripe. Direct customers to your custom billing management page.',
		)
	}

	async listInvoices(customerId: string, limit = 20): Promise<Invoice[]> {
		try {
			const orgId = this.ensureOrganizationId()

			const ordersIterator = await this.polar.orders.list({
				organizationId: orgId,
				limit,
			})

			const invoices: Invoice[] = []

			for await (const page of ordersIterator) {
				const result = page.result
				if (result.items) {
					for (const order of result.items) {
						// Filter by customerId if needed
						if (customerId && order.userId !== customerId) {
							continue
						}

						invoices.push({
							id: order.id,
							number: order.id,
							status: null,
							amountPaid: order.amount || 0,
							amountDue: 0,
							currency: order.currency?.toLowerCase() || 'usd',
							created: order.createdAt
								? new Date(order.createdAt).getTime() / 1000
								: 0,
							dueDate: null,
							hostedInvoiceUrl: null,
							invoicePdf: null,
							periodStart: order.createdAt
								? new Date(order.createdAt).getTime() / 1000
								: 0,
							periodEnd: order.createdAt
								? new Date(order.createdAt).getTime() / 1000
								: 0,
						})
					}
				}
			}

			return invoices
		} catch (error: any) {
			console.error('PolarProvider: Error fetching invoices:', error)
			return []
		}
	}

	async constructWebhookEvent(
		payload: string | Buffer,
		signature: string,
		secret: string,
	): Promise<WebhookEvent> {
		// Polar SDK doesn't export webhook validation utilities in the same way as Stripe
		// For now, we'll parse the payload as JSON and return it
		// In production, you should implement proper webhook signature verification

		try {
			const payloadString =
				typeof payload === 'string' ? payload : payload.toString('utf8')
			const event = JSON.parse(payloadString) as {
				id?: string
				type?: string
				data?: any
			}

			console.warn(
				'PolarProvider: Webhook signature verification is not implemented. Please implement proper validation in production.',
			)

			return {
				id: event.id || '',
				type: event.type || '',
				data: event.data || event,
			}
		} catch (error: any) {
			console.error('PolarProvider: Failed to construct webhook event:', error)
			throw new Error(
				`Failed to parse Polar webhook: ${error?.message || error}`,
			)
		}
	}
}
