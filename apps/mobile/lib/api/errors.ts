import { ApiResponse, AuthError } from '@repo/types'

export type ErrorType =
	| 'network'
	| 'timeout'
	| 'validation'
	| 'authentication'
	| 'authorization'
	| 'rate_limit'
	| 'bot_detection'
	| 'server'
	| 'unknown'

export interface AppError {
	type: ErrorType
	message: string
	field?: string
	details?: Record<string, any>
	originalError?: Error
	retryable: boolean
}

/**
 * Converts API response errors to standardized app errors
 */
export function parseApiError(response: ApiResponse): AppError {
	if (response.success) {
		throw new Error('Cannot parse error from successful response')
	}

	const errorType = categorizeErrorType(response.error || 'unknown')

	return {
		type: errorType,
		message: getUserFriendlyMessage(response),
		details: response.data,
		retryable: isRetryableError(errorType),
	}
}

/**
 * Converts network errors to standardized app errors
 */
export function parseNetworkError(error: Error): AppError {
	let type: ErrorType = 'network'
	let message = 'Unable to connect to server'

	if (error.name === 'AbortError') {
		type = 'timeout'
		message = 'Request timed out'
	} else if (error.message.includes('fetch')) {
		type = 'network'
		message = 'Unable to connect to server'
	} else {
		message = 'Network error occurred'
	}

	return {
		type,
		message,
		originalError: error,
		retryable: type === 'network' || type === 'timeout',
	}
}

/**
 * Converts validation errors to app errors with field-specific messages
 */
export function parseValidationErrors(
	errors: Array<{ field: string; message: string }>,
): AppError[] {
	return errors.map((error) => ({
		type: 'validation' as ErrorType,
		message: error.message,
		field: error.field,
		retryable: false,
	}))
}

/**
 * Categorizes error types based on error codes
 */
function categorizeErrorType(errorCode: string): ErrorType {
	switch (errorCode) {
		case 'timeout':
		case 'network':
			return 'network'

		case 'validation_error':
			return 'validation'

		case 'authentication_failed':
		case 'invalid_credentials':
		case 'unauthorized':
			return 'authentication'

		case 'forbidden':
		case 'access_denied':
			return 'authorization'

		case 'rate_limit_exceeded':
			return 'rate_limit'

		case 'bot_detected':
			return 'bot_detection'

		case 'server_error':
		case 'internal_error':
			return 'server'

		default:
			return 'unknown'
	}
}

/**
 * Generates user-friendly error messages
 */
function getUserFriendlyMessage(response: ApiResponse): string {
	// Generate user-friendly messages based on error type
	switch (response.error) {
		case 'timeout':
			return 'Request timed out. Please check your connection and try again.'

		case 'network':
			return 'Unable to connect. Please check your internet connection.'

		case 'rate_limit_exceeded':
			return 'Too many attempts. Please wait a moment before trying again.'

		case 'bot_detected':
			return 'Request blocked for security reasons. Please try again later.'

		case 'validation_error':
			return 'Please check your input and try again.'

		case 'authentication_failed':
		case 'invalid_credentials':
			return 'Invalid username or password. Please try again.'

		case 'unauthorized':
			return 'You need to sign in to continue.'

		case 'forbidden':
		case 'access_denied':
			return "You don't have permission to perform this action."

		case 'server_error':
		case 'internal_error':
			return 'Something went wrong on our end. Please try again later.'

		default:
			// Use the provided message if it exists and is user-friendly
			if (response.message && !response.message.includes('Error:')) {
				return response.message
			}
			return 'An unexpected error occurred. Please try again.'
	}
}

/**
 * Determines if an error type is retryable
 */
function isRetryableError(type: ErrorType): boolean {
	switch (type) {
		case 'network':
		case 'timeout':
		case 'server':
			return true

		case 'validation':
		case 'authentication':
		case 'authorization':
		case 'rate_limit':
		case 'bot_detection':
			return false

		default:
			return false
	}
}

/**
 * Creates an authentication error
 */
export function createAuthError(
	type:
		| 'validation'
		| 'authentication'
		| 'network'
		| 'server'
		| 'banned'
		| 'rate_limit'
		| 'bot_detection',
	message: string,
	field?: string,
	details?: Record<string, any>,
): AuthError {
	return {
		type,
		message,
		field,
		details,
	}
}

/**
 * Checks if an error indicates the user is banned
 */
export function isBannedError(error: AppError): boolean {
	return (
		error.type === 'authorization' &&
		(error.message.toLowerCase().includes('banned') ||
			error.message.toLowerCase().includes('suspended'))
	)
}

/**
 * Checks if an error indicates rate limiting
 */
export function isRateLimitError(error: AppError): boolean {
	return error.type === 'rate_limit'
}

/**
 * Checks if an error indicates bot detection
 */
export function isBotDetectionError(error: AppError): boolean {
	return error.type === 'bot_detection'
}

/**
 * Gets retry delay for retryable errors (in milliseconds)
 */
export function getRetryDelay(error: AppError, attempt: number = 0): number {
	if (!error.retryable) {
		return 0
	}

	switch (error.type) {
		case 'network':
		case 'timeout':
			// Exponential backoff: 1s, 2s, 4s, 8s (max)
			return Math.min(1000 * Math.pow(2, attempt), 8000)

		case 'server':
			// Longer delay for server errors: 2s, 4s, 8s, 16s (max)
			return Math.min(2000 * Math.pow(2, attempt), 16000)

		default:
			return 1000
	}
}

/**
 * Error handler class for managing error state and retry logic
 */
export class ErrorHandler {
	private errors: AppError[] = []
	private retryCallbacks: Map<string, () => Promise<void>> = new Map()

	/**
	 * Adds an error to the handler
	 */
	addError(error: AppError, retryCallback?: () => Promise<void>): void {
		this.errors.push(error)

		if (retryCallback && error.retryable) {
			const errorId = this.generateErrorId(error)
			this.retryCallbacks.set(errorId, retryCallback)
		}
	}

	/**
	 * Clears all errors
	 */
	clearErrors(): void {
		this.errors = []
		this.retryCallbacks.clear()
	}

	/**
	 * Gets all current errors
	 */
	getErrors(): AppError[] {
		return [...this.errors]
	}

	/**
	 * Gets errors by type
	 */
	getErrorsByType(type: ErrorType): AppError[] {
		return this.errors.filter((error) => error.type === type)
	}

	/**
	 * Gets errors by field (for validation errors)
	 */
	getErrorsByField(field: string): AppError[] {
		return this.errors.filter((error) => error.field === field)
	}

	/**
	 * Checks if there are any errors
	 */
	hasErrors(): boolean {
		return this.errors.length > 0
	}

	/**
	 * Checks if there are retryable errors
	 */
	hasRetryableErrors(): boolean {
		return this.errors.some((error) => error.retryable)
	}

	/**
	 * Retries all retryable errors
	 */
	async retryAll(): Promise<void> {
		const retryPromises = Array.from(this.retryCallbacks.values()).map(
			(callback) => callback(),
		)
		await Promise.allSettled(retryPromises)
	}

	/**
	 * Generates a unique ID for an error
	 */
	private generateErrorId(error: AppError): string {
		return `${error.type}-${error.message}-${error.field || 'global'}`
	}
}
