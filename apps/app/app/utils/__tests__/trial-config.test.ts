import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	getTrialConfig,
	calculateManualTrialDaysRemaining,
} from '../trial-config.server'

describe('Trial Configuration', () => {
	const originalEnv = process.env

	beforeEach(() => {
		// Reset environment variables before each test
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		// Restore original environment variables
		process.env = originalEnv
	})

	describe('getTrialConfig', () => {
		it('should return default values when env vars are not set', () => {
			delete process.env.TRIAL_DAYS
			delete process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL

			const config = getTrialConfig()
			expect(config.trialDays).toBe(14)
			expect(config.creditCardRequired).toBe('manual')
		})

		it('should use environment variables when set', () => {
			process.env.TRIAL_DAYS = '30'
			process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL = 'stripe'

			const config = getTrialConfig()
			expect(config.trialDays).toBe(30)
			expect(config.creditCardRequired).toBe('stripe')
		})

		it('should throw error for invalid TRIAL_DAYS', () => {
			process.env.TRIAL_DAYS = 'invalid'

			expect(() => getTrialConfig()).toThrow(
				'TRIAL_DAYS must be a valid positive number',
			)
		})

		it('should throw error for invalid CREDIT_CARD_REQUIRED_FOR_TRIAL', () => {
			process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL = 'invalid'

			expect(() => getTrialConfig()).toThrow(
				'CREDIT_CARD_REQUIRED_FOR_TRIAL must be either "stripe" or "manual"',
			)
		})
	})

	describe('calculateManualTrialDaysRemaining', () => {
		beforeEach(() => {
			process.env.TRIAL_DAYS = '14'
			process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL = 'manual'
		})

		it('should calculate correct days remaining for new organization', () => {
			const today = new Date()
			const daysRemaining = calculateManualTrialDaysRemaining(today)
			expect(daysRemaining).toBe(14) // 14 - 0 = 14 (full trial period)
		})

		it('should calculate correct days remaining for 5-day-old organization', () => {
			const fiveDaysAgo = new Date()
			fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

			const daysRemaining = calculateManualTrialDaysRemaining(fiveDaysAgo)
			expect(daysRemaining).toBe(9) // 14 - 5 = 9
		})

		it('should return 0 for expired trial', () => {
			const twentyDaysAgo = new Date()
			twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

			const daysRemaining = calculateManualTrialDaysRemaining(twentyDaysAgo)
			expect(daysRemaining).toBe(0)
		})

		it('should adapt to different TRIAL_DAYS values', () => {
			process.env.TRIAL_DAYS = '30'

			const tenDaysAgo = new Date()
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

			const daysRemaining = calculateManualTrialDaysRemaining(tenDaysAgo)
			expect(daysRemaining).toBe(20) // 30 - 10 = 20
		})
	})
})
