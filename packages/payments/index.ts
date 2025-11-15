/**
 * @repo/payments - Centralized payment provider package
 *
 * This package provides a unified interface for payment processing,
 * making it easy to switch between different payment providers
 * (Stripe, Polar, Lemon Squeezy, etc.)
 *
 * @example
 * ```ts
 * import { createPaymentProvider } from '@repo/payments'
 *
 * const provider = createPaymentProvider({
 *   provider: 'stripe',
 *   apiKey: process.env.STRIPE_SECRET_KEY!,
 * })
 *
 * const products = await provider.getProducts()
 * ```
 */

// Core types
export type {
	PaymentProvider,
	PaymentProviderConfig,
	Product,
	Price,
	PriceTier,
	PlansAndPrices,
	Subscription,
	SubscriptionItem,
	CheckoutSession,
	CheckoutSessionOptions,
	CustomerPortalSession,
	CustomerPortalOptions,
	Invoice,
	WebhookEvent,
	SubscriptionUpdateOptions,
	TrialConfig,
} from './src/types'

// Factory functions
export {
	createPaymentProvider,
	createStripeProvider,
	createPolarProvider,
} from './src/factory'

// Providers
export { StripeProvider, PolarProvider } from './src/providers'

// Trial configuration
export {
	getTrialConfig,
	calculateManualTrialDaysRemaining,
} from './src/trial-config'
