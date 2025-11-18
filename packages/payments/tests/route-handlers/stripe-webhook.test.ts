/**
 * Unit tests for Stripe webhook handler
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { handleStripeWebhook } from '../../src/route-handlers/stripe-webhook'
import type { StripeWebhookDependencies } from '../../src/route-handlers/stripe-webhook'
import type Stripe from 'stripe'

describe('handleStripeWebhook', () => {
	let mockStripe: any
	let mockHandleSubscriptionChange: any
	let mockHandleTrialEnd: any
	let webhookDeps: StripeWebhookDependencies

	beforeEach(() => {
		mockHandleSubscriptionChange = vi.fn().mockResolvedValue(undefined)
		mockHandleTrialEnd = vi.fn().mockResolvedValue(undefined)

		mockStripe = {
			webhooks: {
				constructEvent: vi.fn(),
			},
		}

		webhookDeps = {
			stripe: mockStripe,
			handleSubscriptionChange: mockHandleSubscriptionChange,
			handleTrialEnd: mockHandleTrialEnd,
			webhookSecret: 'whsec_test_secret',
		}
	})

	describe('Request validation', () => {
		it('should reject non-POST requests', async () => {
			const request = new Request('https://example.com/webhook', {
				method: 'GET',
			})

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(405)
			expect(await response.text()).toBe('Method not allowed')
		})

		it('should reject requests without signature', async () => {
			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				body: '{}',
			})

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(400)
			expect(await response.text()).toBe('Missing signature')
		})

		it('should reject requests with invalid signature', async () => {
			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'invalid_signature',
				},
				body: '{}',
			})

			mockStripe.webhooks.constructEvent.mockImplementation(() => {
				throw new Error('Invalid signature')
			})

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(400)
			expect(await response.text()).toBe('Invalid signature')
		})
	})

	describe('Subscription events', () => {
		it('should handle customer.subscription.created event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_123',
				type: 'customer.subscription.created',
				data: {
					object: {
						id: 'sub_123',
						status: 'active',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(await response.text()).toBe('Webhook processed successfully')
			expect(mockHandleSubscriptionChange).toHaveBeenCalledWith({
				id: 'sub_123',
				status: 'active',
				customer: 'cus_123',
				items: [
					{
						price: {
							id: 'price_123',
							product: 'prod_123',
						},
					},
				],
			})
		})

		it('should handle customer.subscription.updated event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_124',
				type: 'customer.subscription.updated',
				data: {
					object: {
						id: 'sub_123',
						status: 'past_due',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleSubscriptionChange).toHaveBeenCalledWith({
				id: 'sub_123',
				status: 'past_due',
				customer: 'cus_123',
				items: [
					{
						price: {
							id: 'price_123',
							product: 'prod_123',
						},
					},
				],
			})
		})

		it('should handle customer.subscription.deleted event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_125',
				type: 'customer.subscription.deleted',
				data: {
					object: {
						id: 'sub_123',
						status: 'canceled',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleSubscriptionChange).toHaveBeenCalledWith({
				id: 'sub_123',
				status: 'canceled',
				customer: 'cus_123',
				items: [
					{
						price: {
							id: 'price_123',
							product: 'prod_123',
						},
					},
				],
			})
		})

		it('should handle customer.subscription.paused event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_126',
				type: 'customer.subscription.paused',
				data: {
					object: {
						id: 'sub_123',
						status: 'paused',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleSubscriptionChange).toHaveBeenCalled()
		})

		it('should handle customer.subscription.resumed event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_127',
				type: 'customer.subscription.resumed',
				data: {
					object: {
						id: 'sub_123',
						status: 'active',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleSubscriptionChange).toHaveBeenCalled()
		})
	})

	describe('Trial events', () => {
		it('should handle customer.subscription.trial_will_end event', async () => {
			const trialEnd = Math.floor(Date.now() / 1000) + 86400

			const mockEvent: Stripe.Event = {
				id: 'evt_128',
				type: 'customer.subscription.trial_will_end',
				data: {
					object: {
						id: 'sub_123',
						customer: 'cus_123',
						trial_end: trialEnd,
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleTrialEnd).toHaveBeenCalledWith({
				id: 'sub_123',
				customer: 'cus_123',
				trial_end: trialEnd,
			})
		})
	})

	describe('Invoice events', () => {
		it('should handle invoice.payment_succeeded event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_129',
				type: 'invoice.payment_succeeded',
				data: {
					object: {
						id: 'in_123',
						amount_paid: 1000,
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			// This event is logged but doesn't call any handlers
			expect(mockHandleSubscriptionChange).not.toHaveBeenCalled()
			expect(mockHandleTrialEnd).not.toHaveBeenCalled()
		})

		it('should handle invoice.payment_failed event', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_130',
				type: 'invoice.payment_failed',
				data: {
					object: {
						id: 'in_123',
						amount_due: 1000,
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
		})
	})

	describe('Unhandled events', () => {
		it('should log unhandled event types', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_131',
				type: 'customer.created',
				data: {
					object: {} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(await response.text()).toBe('Webhook processed successfully')
		})
	})

	describe('Error handling', () => {
		it('should return 500 when handler throws error', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_132',
				type: 'customer.subscription.updated',
				data: {
					object: {
						id: 'sub_123',
						status: 'active',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)
			mockHandleSubscriptionChange.mockRejectedValue(
				new Error('Database error'),
			)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(500)
			expect(await response.text()).toBe('Webhook processing failed')
		})

		it('should handle subscription with multiple items', async () => {
			const mockEvent: Stripe.Event = {
				id: 'evt_133',
				type: 'customer.subscription.updated',
				data: {
					object: {
						id: 'sub_123',
						status: 'active',
						customer: 'cus_123',
						items: {
							data: [
								{
									price: {
										id: 'price_123',
										product: 'prod_123',
									},
								},
								{
									price: {
										id: 'price_456',
										product: 'prod_456',
									},
								},
							],
						},
					} as any,
				},
			} as any

			const request = new Request('https://example.com/webhook', {
				method: 'POST',
				headers: {
					'stripe-signature': 'valid_signature',
				},
				body: JSON.stringify(mockEvent),
			})

			mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent)

			const response = await handleStripeWebhook(
				{ request } as any,
				webhookDeps,
			)

			expect(response.status).toBe(200)
			expect(mockHandleSubscriptionChange).toHaveBeenCalledWith({
				id: 'sub_123',
				status: 'active',
				customer: 'cus_123',
				items: [
					{
						price: {
							id: 'price_123',
							product: 'prod_123',
						},
					},
					{
						price: {
							id: 'price_456',
							product: 'prod_456',
						},
					},
				],
			})
		})
	})
})
