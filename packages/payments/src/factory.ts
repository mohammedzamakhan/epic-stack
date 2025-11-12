/**
 * Payment provider factory
 * Creates the appropriate payment provider based on configuration
 */

import type { PaymentProvider, PaymentProviderConfig } from './types'
import { StripeProvider } from './providers/stripe'

/**
 * Create a payment provider instance
 * @param config Provider configuration
 * @returns PaymentProvider instance
 * @example
 * ```ts
 * const provider = createPaymentProvider({
 *   provider: 'stripe',
 *   apiKey: process.env.STRIPE_SECRET_KEY!,
 * })
 * ```
 */
export function createPaymentProvider(
	config: PaymentProviderConfig,
): PaymentProvider {
	switch (config.provider) {
		case 'stripe':
			return new StripeProvider({
				apiKey: config.apiKey,
				apiVersion: config.apiVersion,
			})
		case 'polar':
			throw new Error(
				'Polar provider not yet implemented. Coming soon! For now, use Stripe.',
			)
		case 'lemon-squeezy':
			throw new Error(
				'Lemon Squeezy provider not yet implemented. Coming soon! For now, use Stripe.',
			)
		default:
			throw new Error(`Unknown payment provider: ${config.provider}`)
	}
}

/**
 * Create a Stripe payment provider instance (convenience function)
 * @param apiKey Stripe API key
 * @param apiVersion Optional Stripe API version
 * @returns StripeProvider instance
 */
export function createStripeProvider(
	apiKey: string,
	apiVersion?: string,
): StripeProvider {
	return new StripeProvider({ apiKey, apiVersion })
}
