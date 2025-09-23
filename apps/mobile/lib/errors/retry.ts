import { AppErrorType, ErrorCategory } from './types'
import { categorizeError, isRetryableError } from './categorizer'

export interface RetryConfig {
	maxAttempts: number
	baseDelay: number
	maxDelay: number
	backoffFactor: number
	retryableErrors?: ErrorCategory[]
}

export interface RetryState {
	attempt: number
	lastError?: AppErrorType
	nextRetryAt?: Date
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	backoffFactor: 2,
	retryableErrors: [
		ErrorCategory.NETWORK,
		ErrorCategory.SERVER,
		ErrorCategory.RATE_LIMIT,
		ErrorCategory.OAUTH,
	],
}

/**
 * Retry utility class for handling automatic retries with exponential backoff
 */
export class RetryManager {
	private config: RetryConfig
	private state: RetryState

	constructor(config: Partial<RetryConfig> = {}) {
		this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
		this.state = { attempt: 0 }
	}

	/**
	 * Executes a function with retry logic
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		this.state.attempt = 0
		this.state.lastError = undefined
		this.state.nextRetryAt = undefined

		while (this.state.attempt < this.config.maxAttempts) {
			try {
				const result = await fn()
				this.reset()
				return result
			} catch (error) {
				this.state.attempt++
				this.state.lastError = categorizeError(error)

				// If this was the last attempt or error is not retryable, throw
				if (
					this.state.attempt >= this.config.maxAttempts ||
					!this.shouldRetry(this.state.lastError)
				) {
					throw this.state.lastError
				}

				// Calculate delay and wait
				const delay = this.calculateDelay(this.state.attempt)
				this.state.nextRetryAt = new Date(Date.now() + delay)
				await this.wait(delay)
			}
		}

		// This should never be reached, but TypeScript requires it
		throw this.state.lastError || new Error('Max retry attempts exceeded')
	}

	/**
	 * Checks if an error should be retried
	 */
	private shouldRetry(error: AppErrorType): boolean {
		// Check if error is generally retryable
		if (!isRetryableError(error)) {
			return false
		}

		// Check if error category is in retryable list
		if (
			this.config.retryableErrors &&
			!this.config.retryableErrors.includes(error.category)
		) {
			return false
		}

		// Special handling for rate limit errors
		if (error.category === ErrorCategory.RATE_LIMIT) {
			return true
		}

		// Special handling for specific status codes
		if (error.statusCode) {
			// Don't retry client errors (4xx) except for specific cases
			if (error.statusCode >= 400 && error.statusCode < 500) {
				return error.statusCode === 429 || error.statusCode === 408 // Rate limit or timeout
			}
		}

		return true
	}

	/**
	 * Calculates delay for next retry using exponential backoff
	 */
	private calculateDelay(attempt: number): number {
		const delay =
			this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1)

		// Add jitter to prevent thundering herd
		const jitter = Math.random() * 0.1 * delay

		return Math.min(delay + jitter, this.config.maxDelay)
	}

	/**
	 * Waits for specified delay
	 */
	private wait(delay: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, delay))
	}

	/**
	 * Resets the retry state
	 */
	reset(): void {
		this.state = { attempt: 0 }
	}

	/**
	 * Gets current retry state
	 */
	getState(): RetryState {
		return { ...this.state }
	}

	/**
	 * Gets time until next retry
	 */
	getTimeUntilNextRetry(): number {
		if (!this.state.nextRetryAt) {
			return 0
		}
		return Math.max(0, this.state.nextRetryAt.getTime() - Date.now())
	}
}

/**
 * Creates a retry manager with network-specific configuration
 */
export function createNetworkRetryManager(): RetryManager {
	return new RetryManager({
		maxAttempts: 3,
		baseDelay: 1000,
		maxDelay: 10000,
		backoffFactor: 2,
		retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.SERVER],
	})
}

/**
 * Creates a retry manager with authentication-specific configuration
 */
export function createAuthRetryManager(): RetryManager {
	return new RetryManager({
		maxAttempts: 2,
		baseDelay: 500,
		maxDelay: 2000,
		backoffFactor: 2,
		retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.SERVER],
	})
}

/**
 * Utility function to retry a function with default configuration
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config?: Partial<RetryConfig>,
): Promise<T> {
	const retryManager = new RetryManager(config)
	return retryManager.execute(fn)
}

/**
 * Utility function to check if we should show a retry button
 */
export function shouldShowRetryButton(error: AppErrorType): boolean {
	return isRetryableError(error) && error.category !== ErrorCategory.RATE_LIMIT
}

/**
 * Utility function to get retry delay for rate limit errors
 */
export function getRateLimitRetryDelay(error: AppErrorType): number {
	if (error.category === ErrorCategory.RATE_LIMIT && 'retryAfter' in error) {
		return (error.retryAfter || 60) * 1000 // Convert to milliseconds
	}
	return 0
}
