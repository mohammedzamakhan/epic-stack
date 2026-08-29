/**
 * Unit tests for duplicate subscription cleanup
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { cleanupDuplicateSubscriptions } from '../../src/utils/duplicate-subscriptions'

describe('cleanupDuplicateSubscriptions', () => {
	let mockStripe: any

	beforeEach(() => {
		mockStripe = {
			subscriptions: {
				list: vi.fn(),
				retrieve: vi.fn(),
				cancel: vi.fn(),
			},
			refunds: {
				create: vi.fn(),
			},
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('should return early when only one billable subscription exists', async () => {
		mockStripe.subscriptions.list.mockResolvedValue({
			data: [{ id: 'sub_1', status: 'active', created: 100 }],
		})

		const result = await cleanupDuplicateSubscriptions(mockStripe, 'cus_123')

		expect(result.keptSubscriptionId).toBe('sub_1')
		expect(result.cancelledSubscriptionIds).toEqual([])
		expect(mockStripe.subscriptions.cancel).not.toHaveBeenCalled()
	})

	it('should keep newest subscription and cancel older duplicates', async () => {
		mockStripe.subscriptions.list.mockResolvedValue({
			data: [
				{ id: 'sub_old', status: 'active', created: 100 },
				{ id: 'sub_new', status: 'active', created: 200 },
			],
		})

		mockStripe.subscriptions.retrieve.mockResolvedValue({
			id: 'sub_old',
			created: Math.floor(Date.now() / 1000) - 60,
			latest_invoice: {
				status: 'paid',
				payment_intent: { id: 'pi_123' },
			},
		})

		mockStripe.refunds.create.mockResolvedValue({ id: 're_123' })
		mockStripe.subscriptions.cancel.mockResolvedValue({ id: 'sub_old' })

		const result = await cleanupDuplicateSubscriptions(mockStripe, 'cus_123')

		expect(result.keptSubscriptionId).toBe('sub_new')
		expect(result.cancelledSubscriptionIds).toEqual(['sub_old'])
		expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old')
	})

	it('should include trialing subscriptions in dedup', async () => {
		mockStripe.subscriptions.list.mockResolvedValue({
			data: [
				{ id: 'sub_trialing', status: 'trialing', created: 100 },
				{ id: 'sub_active', status: 'active', created: 200 },
			],
		})

		mockStripe.subscriptions.retrieve.mockResolvedValue({
			id: 'sub_trialing',
			created: Math.floor(Date.now() / 1000) - 3600,
			latest_invoice: { status: 'open' },
		})
		mockStripe.subscriptions.cancel.mockResolvedValue({})

		const result = await cleanupDuplicateSubscriptions(mockStripe, 'cus_123')

		expect(result.keptSubscriptionId).toBe('sub_active')
		expect(result.cancelledSubscriptionIds).toEqual(['sub_trialing'])
	})
})
