import {
  categorizeError,
  isRetryableError,
  isNetworkError,
  isAuthenticationError,
  isValidationError,
} from '../categorizer'
import { ErrorCategory } from '../types'

describe('categorizeError', () => {
  it('categorizes network errors by message pattern', () => {
    const error = categorizeError({ status: 0, message: 'Network request failed' })
    expect(error.category).toBe(ErrorCategory.NETWORK)
  })

  it('categorizes authentication errors by status code', () => {
    const error = categorizeError({ status: 401, message: 'Unauthorized' })
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes validation errors by status code', () => {
    const error = categorizeError({ status: 400, message: 'Bad request' })
    expect(error.category).toBe(ErrorCategory.VALIDATION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes rate limit errors by status code', () => {
    const error = categorizeError({ status: 429, message: 'Too many requests' })
    expect(error.category).toBe(ErrorCategory.RATE_LIMIT)
    expect(error.retryable).toBe(true)
  })

  it('categorizes server errors by status code', () => {
    const error = categorizeError({ status: 500, message: 'Internal server error' })
    expect(error.category).toBe(ErrorCategory.SERVER)
    expect(error.retryable).toBe(true)
  })

  it('categorizes bot detection errors by status code', () => {
    const error = categorizeError({ status: 403, message: 'Forbidden' })
    expect(error.category).toBe(ErrorCategory.BOT_DETECTION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes network errors by message pattern', () => {
    const error = categorizeError({ message: 'Network connection failed' })
    expect(error.category).toBe(ErrorCategory.NETWORK)
    expect(error.retryable).toBe(true)
  })

  it('categorizes authentication errors by message pattern', () => {
    const error = categorizeError({ message: 'Invalid credentials provided' })
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes validation errors by message pattern', () => {
    const error = categorizeError({ message: 'Validation failed for email field' })
    expect(error.category).toBe(ErrorCategory.VALIDATION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes OAuth errors by message pattern', () => {
    const error = categorizeError({ message: 'OAuth authorization failed' })
    expect(error.category).toBe(ErrorCategory.OAUTH)
    expect(error.retryable).toBe(true)
  })

  it('categorizes rate limit errors by message pattern', () => {
    const error = categorizeError({ message: 'Rate limit exceeded' })
    expect(error.category).toBe(ErrorCategory.RATE_LIMIT)
    expect(error.retryable).toBe(true)
  })

  it('categorizes bot detection errors by message pattern', () => {
    const error = categorizeError({ message: 'Bot detected, access denied' })
    expect(error.category).toBe(ErrorCategory.BOT_DETECTION)
    expect(error.retryable).toBe(false)
  })

  it('categorizes server errors by message pattern', () => {
    const error = categorizeError({ message: 'Internal server error occurred' })
    expect(error.category).toBe(ErrorCategory.SERVER)
    expect(error.retryable).toBe(true)
  })

  it('defaults to unknown category for unrecognized errors', () => {
    const error = categorizeError({ message: 'Some random error' })
    expect(error.category).toBe(ErrorCategory.UNKNOWN)
    expect(error.retryable).toBe(false)
  })

  it('handles Error objects', () => {
    const originalError = new Error('Network timeout')
    const error = categorizeError(originalError)
    expect(error.category).toBe(ErrorCategory.NETWORK)
    expect(error.originalError).toBe(originalError)
  })

  it('generates correct error codes', () => {
    const error = categorizeError({ status: 401, message: 'Unauthorized' })
    expect(error.code).toBe('AUTHENTICATION_401')
  })

  it('sets specific properties for network errors', () => {
    const timeoutError = categorizeError({ message: 'Request timeout' })
    expect(timeoutError.category).toBe(ErrorCategory.NETWORK)
    expect((timeoutError as any).timeout).toBe(true)

    const offlineError = categorizeError({ message: 'Network offline' })
    expect(offlineError.category).toBe(ErrorCategory.NETWORK)
    expect((offlineError as any).offline).toBe(true)
  })

  it('sets specific properties for authentication errors', () => {
    const bannedError = categorizeError({ message: 'Account banned' })
    expect(bannedError.category).toBe(ErrorCategory.AUTHENTICATION)
    expect((bannedError as any).banned).toBe(true)

    const suspendedError = categorizeError({ message: 'Account suspended' })
    expect(suspendedError.category).toBe(ErrorCategory.AUTHENTICATION)
    expect((suspendedError as any).suspended).toBe(true)
  })

  it('sets specific properties for OAuth errors', () => {
    const cancelledError = categorizeError({ message: 'OAuth cancelled by user' })
    expect(cancelledError.category).toBe(ErrorCategory.OAUTH)
    expect((cancelledError as any).cancelled).toBe(true)
  })

  it('sets specific properties for server errors', () => {
    const maintenanceError = categorizeError({ message: 'Server under maintenance' })
    expect(maintenanceError.category).toBe(ErrorCategory.SERVER)
    expect((maintenanceError as any).maintenance).toBe(true)
  })
})

describe('error type guards', () => {
  it('identifies retryable errors', () => {
    const retryableError = categorizeError({ status: 500, message: 'Server error' })
    const nonRetryableError = categorizeError({ status: 400, message: 'Bad request' })
    
    expect(isRetryableError(retryableError)).toBe(true)
    expect(isRetryableError(nonRetryableError)).toBe(false)
  })

  it('identifies network errors', () => {
    const networkError = categorizeError({ message: 'Network connection failed' })
    const authError = categorizeError({ status: 401, message: 'Unauthorized' })
    
    expect(isNetworkError(networkError)).toBe(true)
    expect(isNetworkError(authError)).toBe(false)
  })

  it('identifies authentication errors', () => {
    const authError = categorizeError({ status: 401, message: 'Unauthorized' })
    const networkError = categorizeError({ message: 'Network connection failed' })
    
    expect(isAuthenticationError(authError)).toBe(true)
    expect(isAuthenticationError(networkError)).toBe(false)
  })

  it('identifies validation errors', () => {
    const validationError = categorizeError({ status: 400, message: 'Validation failed' })
    const authError = categorizeError({ status: 401, message: 'Unauthorized' })
    
    expect(isValidationError(validationError)).toBe(true)
    expect(isValidationError(authError)).toBe(false)
  })
})