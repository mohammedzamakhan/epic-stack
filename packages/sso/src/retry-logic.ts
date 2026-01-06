/**
 * Retry logic for SSO operations with exponential backoff
 * Handles transient failures in identity provider communications
 */

import { type RetryOptions, type RetryResult } from './types.ts'

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	backoffMultiplier: 2,
	retryableErrors: [
		'ECONNRESET',
		'ECONNREFUSED',
		'ETIMEDOUT',
		'ENOTFOUND',
		'EAI_AGAIN',
		'NETWORK_ERROR',
		'TIMEOUT',
		'AbortError',
	],
}

export class SSORetryManager {
	private defaultOptions: RetryOptions

	constructor(options: Partial<RetryOptions> = {}) {
		this.defaultOptions = { ...DEFAULT_RETRY_OPTIONS, ...options }
	}

	/**
	 * Execute a function with retry logic
	 */
	async executeWithRetry<T>(
		operation: () => Promise<T>,
		options: Partial<RetryOptions> = {},
		operationName: string = 'SSO Operation',
	): Promise<RetryResult<T>> {
		const config = { ...this.defaultOptions, ...options }
		const startTime = Date.now()
		let lastError: Error | undefined

		for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
			try {
				const result = await operation()

				return {
					success: true,
					result,
					attempts: attempt,
					totalDuration: Date.now() - startTime,
				}
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error))

				// Check if error is retryable
				if (!this.isRetryableError(lastError, config.retryableErrors)) {
					console.warn(
						`${operationName} failed with non-retryable error:`,
						lastError.message,
					)
					break
				}

				// Don't wait after the last attempt
				if (attempt < config.maxAttempts) {
					const delay = this.calculateDelay(attempt, config)
					console.warn(
						`${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
						lastError.message,
					)
					await this.sleep(delay)
				} else {
					console.error(
						`${operationName} failed after ${attempt} attempts:`,
						lastError.message,
					)
				}
			}
		}

		return {
			success: false,
			error: lastError,
			attempts: config.maxAttempts,
			totalDuration: Date.now() - startTime,
		}
	}

	/**
	 * Retry OIDC discovery with exponential backoff
	 */
	async retryOIDCDiscovery<T>(
		discoveryFunction: () => Promise<T>,
		issuerUrl: string,
	): Promise<RetryResult<T>> {
		return this.executeWithRetry(
			discoveryFunction,
			{
				maxAttempts: 3,
				baseDelay: 2000,
				retryableErrors: [
					...this.defaultOptions.retryableErrors,
					'HTTP_500',
					'HTTP_502',
					'HTTP_503',
					'HTTP_504',
				],
			},
			`OIDC Discovery for ${issuerUrl}`,
		)
	}

	/**
	 * Retry token exchange with shorter delays
	 */
	async retryTokenExchange<T>(
		tokenFunction: () => Promise<T>,
		provider: string,
	): Promise<RetryResult<T>> {
		return this.executeWithRetry(
			tokenFunction,
			{
				maxAttempts: 2,
				baseDelay: 500,
				maxDelay: 2000,
				retryableErrors: [
					...this.defaultOptions.retryableErrors,
					'HTTP_500',
					'HTTP_502',
					'HTTP_503',
				],
			},
			`Token Exchange with ${provider}`,
		)
	}

	/**
	 * Retry user info fetch
	 */
	async retryUserInfoFetch<T>(
		userInfoFunction: () => Promise<T>,
		provider: string,
	): Promise<RetryResult<T>> {
		return this.executeWithRetry(
			userInfoFunction,
			{
				maxAttempts: 2,
				baseDelay: 1000,
				retryableErrors: [
					...this.defaultOptions.retryableErrors,
					'HTTP_500',
					'HTTP_502',
					'HTTP_503',
				],
			},
			`User Info Fetch from ${provider}`,
		)
	}

	/**
	 * Retry configuration test
	 */
	async retryConfigurationTest<T>(
		testFunction: () => Promise<T>,
		organizationId: string,
	): Promise<RetryResult<T>> {
		return this.executeWithRetry(
			testFunction,
			{
				maxAttempts: 2,
				baseDelay: 1500,
				retryableErrors: [
					...this.defaultOptions.retryableErrors,
					'HTTP_500',
					'HTTP_502',
					'HTTP_503',
					'HTTP_504',
				],
			},
			`Configuration Test for Organization ${organizationId}`,
		)
	}

	/**
	 * Check if an error is retryable
	 */
	private isRetryableError(error: Error, retryableErrors: string[]): boolean {
		const errorMessage = error.message.toLowerCase()
		const errorName = error.name.toLowerCase()

		return retryableErrors.some((retryableError) => {
			const pattern = retryableError.toLowerCase()
			return errorMessage.includes(pattern) || errorName.includes(pattern)
		})
	}

	/**
	 * Calculate delay with exponential backoff and jitter
	 */
	private calculateDelay(attempt: number, config: RetryOptions): number {
		const exponentialDelay =
			config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
		const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

		// Add jitter to prevent thundering herd
		const jitter = Math.random() * 0.1 * cappedDelay

		return Math.floor(cappedDelay + jitter)
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Create a timeout wrapper for operations
	 */
	withTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number,
		operationName: string = 'Operation',
	): () => Promise<T> {
		return async (): Promise<T> => {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => {
				controller.abort()
			}, timeoutMs)

			try {
				const timeoutPromise = new Promise<never>((_, reject) => {
					controller.signal.addEventListener('abort', () => {
						reject(new Error(`${operationName} timed out after ${timeoutMs}ms`))
					})
				})

				const result = await Promise.race([operation(), timeoutPromise])

				return result
			} finally {
				clearTimeout(timeoutId)
			}
		}
	}

	/**
	 * Circuit breaker pattern for failing services
	 */
	createCircuitBreaker<T>(
		operation: () => Promise<T>,
		options: {
			failureThreshold: number
			resetTimeout: number
			monitoringPeriod: number
		} = {
			failureThreshold: 5,
			resetTimeout: 60000, // 1 minute
			monitoringPeriod: 300000, // 5 minutes
		},
	): () => Promise<T> {
		let failures = 0
		let lastFailureTime = 0
		let state: 'closed' | 'open' | 'half-open' = 'closed'

		return async (): Promise<T> => {
			const now = Date.now()

			// Reset failure count if monitoring period has passed
			if (now - lastFailureTime > options.monitoringPeriod) {
				failures = 0
				state = 'closed'
			}

			// Check circuit breaker state
			if (state === 'open') {
				if (now - lastFailureTime > options.resetTimeout) {
					state = 'half-open'
				} else {
					throw new Error(
						'Circuit breaker is open - service temporarily unavailable',
					)
				}
			}

			try {
				const result = await operation()

				// Success - reset circuit breaker
				if (state === 'half-open') {
					failures = 0
					state = 'closed'
				}

				return result
			} catch (error) {
				failures++
				lastFailureTime = now

				if (failures >= options.failureThreshold) {
					state = 'open'
				}

				throw error
			}
		}
	}
}

/**
 * Create a new SSO retry manager instance
 */
export function createRetryManager(
	options?: Partial<RetryOptions>,
): SSORetryManager {
	return new SSORetryManager(options)
}
