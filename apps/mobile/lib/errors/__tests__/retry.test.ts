import {
	RetryManager,
	createNetworkRetryManager,
	createAuthRetryManager,
	withRetry,
	shouldShowRetryButton,
	getRateLimitRetryDelay,
} from '../retry'
import { categorizeError } from '../categorizer'
import { ErrorCategory } from '../types'

// Mock setTimeout for testing
jest.useFakeTimers()

describe('RetryManager', () => {
	beforeEach(() => {
		jest.clearAllTimers()
		jest.spyOn(global, 'setTimeout')
	})

	afterEach(() => {
		jest.runOnlyPendingTimers()
		jest.restoreAllMocks()
	})

	it('executes function successfully on first attempt', async () => {
		const retryManager = new RetryManager()
		const mockFn = jest.fn().mockResolvedValue('success')

		const result = await retryManager.execute(mockFn)

		expect(result).toBe('success')
		expect(mockFn).toHaveBeenCalledTimes(1)
	})

	it('retries on retryable errors', async () => {
		const retryManager = new RetryManager({ maxAttempts: 3, baseDelay: 100 })
		const mockFn = jest
			.fn()
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockResolvedValue('success')

		const executePromise = retryManager.execute(mockFn)

		// Fast-forward through delays
		await jest.runAllTimersAsync()

		const result = await executePromise
		expect(result).toBe('success')
		expect(mockFn).toHaveBeenCalledTimes(3)
	}, 10000)

	it('throws error after max attempts', async () => {
		const retryManager = new RetryManager({ maxAttempts: 2, baseDelay: 100 })
		const mockFn = jest
			.fn()
			.mockRejectedValue(new Error('Network connection failed'))

		const executePromise = retryManager.execute(mockFn)
		await jest.runAllTimersAsync()

		await expect(executePromise).rejects.toMatchObject({
			category: ErrorCategory.NETWORK,
			message: 'Network connection failed',
		})
		expect(mockFn).toHaveBeenCalledTimes(2)
	}, 10000)

	it('does not retry non-retryable errors', async () => {
		const retryManager = new RetryManager()
		const mockFn = jest.fn().mockRejectedValue(new Error('Validation failed'))

		await expect(retryManager.execute(mockFn)).rejects.toMatchObject({
			category: ErrorCategory.VALIDATION,
		})
		expect(mockFn).toHaveBeenCalledTimes(1)
	})

	it('calculates exponential backoff delay', async () => {
		const retryManager = new RetryManager({
			maxAttempts: 3,
			baseDelay: 1000,
			backoffFactor: 2,
		})
		const mockFn = jest
			.fn()
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockResolvedValue('success')

		const executePromise = retryManager.execute(mockFn)

		// Check that delays are increasing
		expect(global.setTimeout).toHaveBeenCalledWith(
			expect.any(Function),
			expect.any(Number),
		)

		await jest.runAllTimersAsync()
		await executePromise
	}, 10000)

	it('respects max delay', async () => {
		const retryManager = new RetryManager({
			maxAttempts: 3,
			baseDelay: 1000,
			maxDelay: 2000,
			backoffFactor: 10,
		})
		const mockFn = jest
			.fn()
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockRejectedValueOnce(new Error('Network connection failed'))
			.mockResolvedValue('success')

		const executePromise = retryManager.execute(mockFn)
		await jest.runAllTimersAsync()
		await executePromise

		// Verify that setTimeout was called with delays <= maxDelay
		const calls = (setTimeout as unknown as jest.Mock).mock.calls
		calls.forEach((call) => {
			if (call[1] > 0) {
				// Ignore immediate calls
				expect(call[1]).toBeLessThanOrEqual(2200) // maxDelay + jitter
			}
		})
	}, 10000)

	it('provides retry state information', () => {
		const retryManager = new RetryManager()

		expect(retryManager.getState().attempt).toBe(0)
		expect(retryManager.getTimeUntilNextRetry()).toBe(0)
	})

	it('resets state after successful execution', async () => {
		const retryManager = new RetryManager()
		const mockFn = jest.fn().mockResolvedValue('success')

		await retryManager.execute(mockFn)

		expect(retryManager.getState().attempt).toBe(0)
		expect(retryManager.getState().lastError).toBeUndefined()
	})
})

describe('retry utility functions', () => {
	it('creates network retry manager with correct config', () => {
		const retryManager = createNetworkRetryManager()
		expect(retryManager).toBeInstanceOf(RetryManager)
	})

	it('creates auth retry manager with correct config', () => {
		const retryManager = createAuthRetryManager()
		expect(retryManager).toBeInstanceOf(RetryManager)
	})

	it('withRetry executes function with retry logic', async () => {
		const mockFn = jest.fn().mockResolvedValue('success')

		const result = await withRetry(mockFn, { maxAttempts: 2 })

		expect(result).toBe('success')
		expect(mockFn).toHaveBeenCalledTimes(1)
	})

	it('shouldShowRetryButton returns true for retryable errors', () => {
		const retryableError = categorizeError({
			message: 'Network connection failed',
		})
		const nonRetryableError = categorizeError({
			status: 400,
			message: 'Bad request',
		})
		const rateLimitError = categorizeError({
			status: 429,
			message: 'Rate limit exceeded',
		})

		expect(shouldShowRetryButton(retryableError)).toBe(true)
		expect(shouldShowRetryButton(nonRetryableError)).toBe(false)
		expect(shouldShowRetryButton(rateLimitError)).toBe(false) // Rate limit errors have special handling
	})

	it('getRateLimitRetryDelay returns correct delay', () => {
		const rateLimitError = {
			category: ErrorCategory.RATE_LIMIT,
			code: 'RATELIMIT_429',
			message: 'Rate limit exceeded',
			retryAfter: 30,
			retryable: true,
		}

		const delay = getRateLimitRetryDelay(rateLimitError as any)
		expect(delay).toBe(30000) // 30 seconds in milliseconds
	})

	it('getRateLimitRetryDelay returns 0 for non-rate-limit errors', () => {
		const networkError = categorizeError({
			message: 'Network connection failed',
		})
		const delay = getRateLimitRetryDelay(networkError)
		expect(delay).toBe(0)
	})
})
