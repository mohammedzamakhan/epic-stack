import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	calculateManualTrialDaysRemaining,
	getTrialConfig,
} from '../src/trial-config'

describe('Trial Configuration', () => {
	const originalEnv = process.env

	beforeEach(() => {
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	describe('getTrialConfig', () => {
		it('should return default values when env vars are not set', () => {
			delete (process.env as any).TRIAL_DAYS
			delete (process.env as any).CREDIT_CARD_REQUIRED_FOR_TRIAL

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
			;(process.env as any).CREDIT_CARD_REQUIRED_FOR_TRIAL = 'invalid'

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
			expect(daysRemaining).toBe(14)
		})

		it('should calculate correct days remaining for 5-day-old organization', () => {
			const fiveDaysAgo = new Date()
			fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

			const daysRemaining = calculateManualTrialDaysRemaining(fiveDaysAgo)
			expect(daysRemaining).toBe(9)
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
			expect(daysRemaining).toBe(20)
		})
	})
})
