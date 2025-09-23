import {
	parseApiError,
	parseNetworkError,
	parseValidationErrors,
	createAuthError,
	isBannedError,
	isRateLimitError,
	isBotDetectionError,
	getRetryDelay,
	ErrorHandler,
} from '../errors'
import { ApiResponse } from '@repo/types'

describe('Error Utilities', () => {
	describe('parseApiError', () => {
		it('should parse validation errors', () => {
			const response: ApiResponse = {
				success: false,
				error: 'validation_error',
				message: 'Validation failed',
				data: [
					{ field: 'username', message: 'Username is required' },
					{ field: 'password', message: 'Password is too short' },
				],
				status: 400,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'validation',
				message: 'Please check your input and try again.',
				details: response.data,
				retryable: false,
			})
		})

		it('should parse authentication errors', () => {
			const response: ApiResponse = {
				success: false,
				error: 'invalid_credentials',
				message: 'Invalid username or password',
				status: 401,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'authentication',
				message: 'Invalid username or password. Please try again.',
				details: undefined,
				retryable: false,
			})
		})

		it('should parse rate limit errors', () => {
			const response: ApiResponse = {
				success: false,
				error: 'rate_limit_exceeded',
				message: 'Too many requests',
				status: 429,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'rate_limit',
				message: 'Too many attempts. Please wait a moment before trying again.',
				details: undefined,
				retryable: false,
			})
		})

		it('should parse bot detection errors', () => {
			const response: ApiResponse = {
				success: false,
				error: 'bot_detected',
				message: 'Request blocked',
				status: 403,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'bot_detection',
				message:
					'Request blocked for security reasons. Please try again later.',
				details: undefined,
				retryable: false,
			})
		})

		it('should parse server errors as retryable', () => {
			const response: ApiResponse = {
				success: false,
				error: 'server_error',
				message: 'Internal server error',
				status: 500,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'server',
				message: 'Something went wrong on our end. Please try again later.',
				details: undefined,
				retryable: true,
			})
		})

		it('should handle unknown errors', () => {
			const response: ApiResponse = {
				success: false,
				error: 'unknown_error',
				message: 'Something went wrong',
				status: 500,
			}

			const error = parseApiError(response)

			expect(error).toEqual({
				type: 'unknown',
				message: 'Something went wrong',
				details: undefined,
				retryable: false,
			})
		})

		it('should throw error for successful responses', () => {
			const response: ApiResponse = {
				success: true,
				data: {},
				status: 200,
			}

			expect(() => parseApiError(response)).toThrow(
				'Cannot parse error from successful response',
			)
		})
	})

	describe('parseNetworkError', () => {
		it('should parse timeout errors', () => {
			const timeoutError = new Error('Request timeout')
			timeoutError.name = 'AbortError'

			const error = parseNetworkError(timeoutError)

			expect(error).toEqual({
				type: 'timeout',
				message: 'Request timed out',
				originalError: timeoutError,
				retryable: true,
			})
		})

		it('should parse fetch errors', () => {
			const fetchError = new Error('fetch failed')

			const error = parseNetworkError(fetchError)

			expect(error).toEqual({
				type: 'network',
				message: 'Unable to connect to server',
				originalError: fetchError,
				retryable: true,
			})
		})

		it('should parse generic network errors', () => {
			const networkError = new Error('Connection refused')

			const error = parseNetworkError(networkError)

			expect(error).toEqual({
				type: 'network',
				message: 'Network error occurred',
				originalError: networkError,
				retryable: true,
			})
		})
	})

	describe('parseValidationErrors', () => {
		it('should convert validation errors to app errors', () => {
			const validationErrors = [
				{ field: 'username', message: 'Username is required' },
				{ field: 'password', message: 'Password is too short' },
				{ field: 'email', message: 'Email is invalid' },
			]

			const errors = parseValidationErrors(validationErrors)

			expect(errors).toHaveLength(3)
			expect(errors[0]).toEqual({
				type: 'validation',
				message: 'Username is required',
				field: 'username',
				retryable: false,
			})
			expect(errors[1]).toEqual({
				type: 'validation',
				message: 'Password is too short',
				field: 'password',
				retryable: false,
			})
			expect(errors[2]).toEqual({
				type: 'validation',
				message: 'Email is invalid',
				field: 'email',
				retryable: false,
			})
		})
	})

	describe('createAuthError', () => {
		it('should create authentication error', () => {
			const error = createAuthError('authentication', 'Invalid credentials')

			expect(error).toEqual({
				type: 'authentication',
				message: 'Invalid credentials',
				field: undefined,
				details: undefined,
			})
		})

		it('should create validation error with field', () => {
			const error = createAuthError(
				'validation',
				'Username is required',
				'username',
			)

			expect(error).toEqual({
				type: 'validation',
				message: 'Username is required',
				field: 'username',
				details: undefined,
			})
		})

		it('should create error with details', () => {
			const details = { code: 'INVALID_FORMAT' }
			const error = createAuthError(
				'validation',
				'Invalid format',
				'email',
				details,
			)

			expect(error).toEqual({
				type: 'validation',
				message: 'Invalid format',
				field: 'email',
				details,
			})
		})
	})

	describe('error type checkers', () => {
		it('should identify banned errors', () => {
			const bannedError = {
				type: 'authorization' as const,
				message: 'Account has been banned',
				retryable: false,
			}

			const suspendedError = {
				type: 'authorization' as const,
				message: 'Account suspended',
				retryable: false,
			}

			const normalError = {
				type: 'authentication' as const,
				message: 'Invalid credentials',
				retryable: false,
			}

			expect(isBannedError(bannedError)).toBe(true)
			expect(isBannedError(suspendedError)).toBe(true)
			expect(isBannedError(normalError)).toBe(false)
		})

		it('should identify rate limit errors', () => {
			const rateLimitError = {
				type: 'rate_limit' as const,
				message: 'Too many requests',
				retryable: false,
			}

			const normalError = {
				type: 'authentication' as const,
				message: 'Invalid credentials',
				retryable: false,
			}

			expect(isRateLimitError(rateLimitError)).toBe(true)
			expect(isRateLimitError(normalError)).toBe(false)
		})

		it('should identify bot detection errors', () => {
			const botError = {
				type: 'bot_detection' as const,
				message: 'Bot detected',
				retryable: false,
			}

			const normalError = {
				type: 'authentication' as const,
				message: 'Invalid credentials',
				retryable: false,
			}

			expect(isBotDetectionError(botError)).toBe(true)
			expect(isBotDetectionError(normalError)).toBe(false)
		})
	})

	describe('getRetryDelay', () => {
		it('should return 0 for non-retryable errors', () => {
			const error = {
				type: 'validation' as const,
				message: 'Validation failed',
				retryable: false,
			}

			expect(getRetryDelay(error)).toBe(0)
		})

		it('should calculate exponential backoff for network errors', () => {
			const error = {
				type: 'network' as const,
				message: 'Network error',
				retryable: true,
			}

			expect(getRetryDelay(error, 0)).toBe(1000) // 1s
			expect(getRetryDelay(error, 1)).toBe(2000) // 2s
			expect(getRetryDelay(error, 2)).toBe(4000) // 4s
			expect(getRetryDelay(error, 3)).toBe(8000) // 8s (max)
			expect(getRetryDelay(error, 4)).toBe(8000) // Still 8s (max)
		})

		it('should calculate longer delays for server errors', () => {
			const error = {
				type: 'server' as const,
				message: 'Server error',
				retryable: true,
			}

			expect(getRetryDelay(error, 0)).toBe(2000) // 2s
			expect(getRetryDelay(error, 1)).toBe(4000) // 4s
			expect(getRetryDelay(error, 2)).toBe(8000) // 8s
			expect(getRetryDelay(error, 3)).toBe(16000) // 16s (max)
			expect(getRetryDelay(error, 4)).toBe(16000) // Still 16s (max)
		})
	})

	describe('ErrorHandler', () => {
		let errorHandler: ErrorHandler

		beforeEach(() => {
			errorHandler = new ErrorHandler()
		})

		it('should add and retrieve errors', () => {
			const error1 = {
				type: 'validation' as const,
				message: 'Validation failed',
				retryable: false,
			}

			const error2 = {
				type: 'network' as const,
				message: 'Network error',
				retryable: true,
			}

			errorHandler.addError(error1)
			errorHandler.addError(error2)

			const errors = errorHandler.getErrors()
			expect(errors).toHaveLength(2)
			expect(errors).toContain(error1)
			expect(errors).toContain(error2)
		})

		it('should clear all errors', () => {
			const error = {
				type: 'validation' as const,
				message: 'Validation failed',
				retryable: false,
			}

			errorHandler.addError(error)
			expect(errorHandler.hasErrors()).toBe(true)

			errorHandler.clearErrors()
			expect(errorHandler.hasErrors()).toBe(false)
			expect(errorHandler.getErrors()).toHaveLength(0)
		})

		it('should filter errors by type', () => {
			const validationError = {
				type: 'validation' as const,
				message: 'Validation failed',
				retryable: false,
			}

			const networkError = {
				type: 'network' as const,
				message: 'Network error',
				retryable: true,
			}

			errorHandler.addError(validationError)
			errorHandler.addError(networkError)

			const validationErrors = errorHandler.getErrorsByType('validation')
			expect(validationErrors).toHaveLength(1)
			expect(validationErrors[0]).toBe(validationError)

			const networkErrors = errorHandler.getErrorsByType('network')
			expect(networkErrors).toHaveLength(1)
			expect(networkErrors[0]).toBe(networkError)
		})

		it('should filter errors by field', () => {
			const usernameError = {
				type: 'validation' as const,
				message: 'Username is required',
				field: 'username',
				retryable: false,
			}

			const passwordError = {
				type: 'validation' as const,
				message: 'Password is too short',
				field: 'password',
				retryable: false,
			}

			errorHandler.addError(usernameError)
			errorHandler.addError(passwordError)

			const usernameErrors = errorHandler.getErrorsByField('username')
			expect(usernameErrors).toHaveLength(1)
			expect(usernameErrors[0]).toBe(usernameError)
		})

		it('should detect retryable errors', () => {
			const validationError = {
				type: 'validation' as const,
				message: 'Validation failed',
				retryable: false,
			}

			const networkError = {
				type: 'network' as const,
				message: 'Network error',
				retryable: true,
			}

			errorHandler.addError(validationError)
			expect(errorHandler.hasRetryableErrors()).toBe(false)

			errorHandler.addError(networkError)
			expect(errorHandler.hasRetryableErrors()).toBe(true)
		})

		it('should handle retry callbacks', async () => {
			const retryCallback = jest.fn().mockResolvedValue(undefined)
			const error = {
				type: 'network' as const,
				message: 'Network error',
				retryable: true,
			}

			errorHandler.addError(error, retryCallback)
			await errorHandler.retryAll()

			expect(retryCallback).toHaveBeenCalledTimes(1)
		})

		it('should handle multiple retry callbacks', async () => {
			const retryCallback1 = jest.fn().mockResolvedValue(undefined)
			const retryCallback2 = jest.fn().mockResolvedValue(undefined)

			const error1 = {
				type: 'network' as const,
				message: 'Network error 1',
				retryable: true,
			}

			const error2 = {
				type: 'server' as const,
				message: 'Server error',
				retryable: true,
			}

			errorHandler.addError(error1, retryCallback1)
			errorHandler.addError(error2, retryCallback2)

			await errorHandler.retryAll()

			expect(retryCallback1).toHaveBeenCalledTimes(1)
			expect(retryCallback2).toHaveBeenCalledTimes(1)
		})
	})
})
