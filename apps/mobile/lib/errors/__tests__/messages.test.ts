import {
  getErrorMessage,
  getErrorActionText,
  getErrorTitle,
  formatValidationErrors,
} from '../messages'
import { categorizeError } from '../categorizer'
import { ErrorCategory } from '../types'

describe('getErrorMessage', () => {
  it('returns specific message for network timeout', () => {
    const error = categorizeError({ message: 'Request timeout' })
    const message = getErrorMessage(error)
    expect(message).toBe('Request timed out. Please try again.')
  })

  it('returns specific message for offline network error', () => {
    const error = categorizeError({ message: 'Network offline' })
    const message = getErrorMessage(error)
    expect(message).toBe('You appear to be offline. Please check your internet connection.')
  })

  it('returns specific message for banned account', () => {
    const error = categorizeError({ message: 'Account banned' })
    const message = getErrorMessage(error)
    expect(message).toBe('Your account has been suspended. Please contact support for assistance.')
  })

  it('returns specific message for suspended account', () => {
    const error = categorizeError({ message: 'Account suspended' })
    const message = getErrorMessage(error)
    expect(message).toBe('Your account is temporarily suspended. Please contact support.')
  })

  it('returns specific message for invalid credentials', () => {
    const error = categorizeError({ status: 401, message: 'Invalid username or password' })
    const message = getErrorMessage(error)
    expect(message).toBe('You are not authorized to access this resource.')
  })

  it('returns specific message for email validation', () => {
    const error = categorizeError({ message: 'Invalid email format' })
    const message = getErrorMessage(error)
    expect(message).toBe('Please enter a valid email address.')
  })

  it('returns specific message for cancelled OAuth', () => {
    const error = categorizeError({ message: 'OAuth cancelled by user' })
    const message = getErrorMessage(error)
    expect(message).toBe('Login was cancelled. Please try again if you want to continue.')
  })

  it('returns specific message for maintenance', () => {
    const error = categorizeError({ message: 'Server under maintenance' })
    const message = getErrorMessage(error)
    expect(message).toBe('The service is currently under maintenance. Please try again later.')
  })

  it('returns default message for unknown errors', () => {
    const error = categorizeError({ message: 'Some random error' })
    const message = getErrorMessage(error)
    expect(message).toBe('An unexpected error occurred. Please try again.')
  })

  it('returns category default when no specific message matches', () => {
    const error = categorizeError({ status: 500, message: 'Some server error' })
    const message = getErrorMessage(error)
    expect(message).toBe('An internal server error occurred. Please try again later.')
  })
})

describe('getErrorActionText', () => {
  it('returns "Retry" for network errors', () => {
    const error = categorizeError({ message: 'Network connection failed' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Retry')
  })

  it('returns "Retry" for OAuth errors', () => {
    const error = categorizeError({ message: 'OAuth authorization failed' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Retry')
  })

  it('returns "Contact Support" for banned accounts', () => {
    const error = categorizeError({ message: 'Account banned' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Contact Support')
  })

  it('returns "Contact Support" for suspended accounts', () => {
    const error = categorizeError({ message: 'Account suspended' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Contact Support')
  })

  it('returns "Contact Support" for bot detection', () => {
    const error = categorizeError({ status: 403, message: 'Bot detected' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Contact Support')
  })

  it('returns "Retry Later" for rate limit errors', () => {
    const error = categorizeError({ status: 429, message: 'Rate limit exceeded' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Retry Later')
  })

  it('returns "Retry" for server errors', () => {
    const error = categorizeError({ status: 500, message: 'Internal server error' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Retry')
  })

  it('returns undefined for maintenance errors', () => {
    const error = categorizeError({ message: 'Server under maintenance' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBeUndefined()
  })

  it('returns undefined for validation errors', () => {
    const error = categorizeError({ status: 400, message: 'Validation failed' })
    const actionText = getErrorActionText(error)
    expect(actionText).toBeUndefined()
  })

  it('returns "Retry" for retryable unknown errors', () => {
    const error = { ...categorizeError({ message: 'Some error' }), retryable: true }
    const actionText = getErrorActionText(error)
    expect(actionText).toBe('Retry')
  })
})

describe('getErrorTitle', () => {
  it('returns correct title for network errors', () => {
    const error = categorizeError({ message: 'Network connection failed' })
    const title = getErrorTitle(error)
    expect(title).toBe('Connection Error')
  })

  it('returns correct title for authentication errors', () => {
    const error = categorizeError({ status: 401, message: 'Unauthorized' })
    const title = getErrorTitle(error)
    expect(title).toBe('Authentication Error')
  })

  it('returns correct title for validation errors', () => {
    const error = categorizeError({ status: 400, message: 'Validation failed' })
    const title = getErrorTitle(error)
    expect(title).toBe('Validation Error')
  })

  it('returns correct title for OAuth errors', () => {
    const error = categorizeError({ message: 'OAuth authorization failed' })
    const title = getErrorTitle(error)
    expect(title).toBe('Login Error')
  })

  it('returns correct title for rate limit errors', () => {
    const error = categorizeError({ status: 429, message: 'Rate limit exceeded' })
    const title = getErrorTitle(error)
    expect(title).toBe('Rate Limit Exceeded')
  })

  it('returns correct title for bot detection errors', () => {
    const error = categorizeError({ status: 403, message: 'Bot detected' })
    const title = getErrorTitle(error)
    expect(title).toBe('Access Denied')
  })

  it('returns correct title for server errors', () => {
    const error = categorizeError({ status: 500, message: 'Internal server error' })
    const title = getErrorTitle(error)
    expect(title).toBe('Server Error')
  })

  it('returns generic title for unknown errors', () => {
    const error = categorizeError({ message: 'Some random error' })
    const title = getErrorTitle(error)
    expect(title).toBe('Error')
  })
})

describe('formatValidationErrors', () => {
  it('formats validation error with fields object', () => {
    const error = {
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_400',
      message: 'Validation failed',
      fields: {
        email: ['Invalid email format'],
        password: ['Password too short', 'Password must contain numbers'],
      },
      retryable: false,
    }
    
    const formatted = formatValidationErrors(error as any)
    expect(formatted).toEqual({
      email: ['Invalid email format'],
      password: ['Password too short', 'Password must contain numbers'],
    })
  })

  it('formats validation error with single field', () => {
    const error = {
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_400',
      message: 'Invalid email format',
      field: 'email',
      retryable: false,
    }
    
    const formatted = formatValidationErrors(error as any)
    expect(formatted).toEqual({
      email: ['Invalid email format'],
    })
  })

  it('formats general validation error', () => {
    const error = {
      category: ErrorCategory.VALIDATION,
      code: 'VALIDATION_400',
      message: 'Form validation failed',
      retryable: false,
    }
    
    const formatted = formatValidationErrors(error as any)
    expect(formatted).toEqual({
      general: ['Form validation failed'],
    })
  })
})