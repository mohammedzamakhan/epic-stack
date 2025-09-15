import { ErrorHandler, handleError, getErrorMessageUtil, shouldRetryError } from '../handler'
import { ErrorCategory } from '../types'

describe('ErrorHandler', () => {
  describe('handle', () => {
    it('processes network errors with toast display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'Network connection failed' })
      
      expect(error.category).toBe(ErrorCategory.NETWORK)
      expect(displayConfig.type).toBe('toast')
      expect(displayConfig.duration).toBe(4000)
      expect(displayConfig.dismissible).toBe(true)
      expect(displayConfig.actionText).toBe('Retry')
    })

    it('processes banned account with modal display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'Account banned' })
      
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
      expect(displayConfig.type).toBe('modal')
      expect(displayConfig.dismissible).toBe(false)
      expect(displayConfig.actionText).toBe('Contact Support')
    })

    it('processes suspended account with banner display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'Account suspended' })
      
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
      expect(displayConfig.type).toBe('banner')
      expect(displayConfig.persistent).toBe(true)
      expect(displayConfig.dismissible).toBe(false)
      expect(displayConfig.actionText).toBe('Contact Support')
    })

    it('processes validation errors with inline display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ status: 400, message: 'Validation failed' })
      
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(displayConfig.type).toBe('inline')
      expect(displayConfig.dismissible).toBe(false)
    })

    it('processes cancelled OAuth with toast display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'OAuth cancelled by user' })
      
      expect(error.category).toBe(ErrorCategory.OAUTH)
      expect(displayConfig.type).toBe('toast')
      expect(displayConfig.duration).toBe(3000)
      expect(displayConfig.dismissible).toBe(true)
    })

    it('processes OAuth errors with retry action', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'OAuth authorization failed' })
      
      expect(error.category).toBe(ErrorCategory.OAUTH)
      expect(displayConfig.type).toBe('toast')
      expect(displayConfig.actionText).toBe('Retry')
    })

    it('processes rate limit errors with banner display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ status: 429, message: 'Rate limit exceeded' })
      
      expect(error.category).toBe(ErrorCategory.RATE_LIMIT)
      expect(displayConfig.type).toBe('banner')
      expect(displayConfig.persistent).toBe(true)
      expect(displayConfig.dismissible).toBe(true)
      expect(displayConfig.actionText).toBe('Retry Later')
    })

    it('processes bot detection with modal display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ status: 403, message: 'Bot detected' })
      
      expect(error.category).toBe(ErrorCategory.BOT_DETECTION)
      expect(displayConfig.type).toBe('modal')
      expect(displayConfig.dismissible).toBe(true)
      expect(displayConfig.actionText).toBe('Contact Support')
    })

    it('processes maintenance errors with persistent banner', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'Server under maintenance' })
      
      expect(error.category).toBe(ErrorCategory.SERVER)
      expect(displayConfig.type).toBe('banner')
      expect(displayConfig.persistent).toBe(true)
      expect(displayConfig.dismissible).toBe(false)
    })

    it('processes server errors with retry action', () => {
      const { error, displayConfig } = ErrorHandler.handle({ status: 500, message: 'Internal server error' })
      
      expect(error.category).toBe(ErrorCategory.SERVER)
      expect(displayConfig.type).toBe('toast')
      expect(displayConfig.actionText).toBe('Retry')
    })

    it('processes unknown errors with default toast display', () => {
      const { error, displayConfig } = ErrorHandler.handle({ message: 'Some random error' })
      
      expect(error.category).toBe(ErrorCategory.UNKNOWN)
      expect(displayConfig.type).toBe('toast')
      expect(displayConfig.duration).toBe(4000)
      expect(displayConfig.dismissible).toBe(true)
    })
  })

  describe('getMessage', () => {
    it('returns user-friendly message', () => {
      const error = { category: ErrorCategory.NETWORK, message: 'Network connection failed' } as any
      const message = ErrorHandler.getMessage(error)
      expect(message).toBe('Network connection failed. Please check your internet connection and try again.')
    })
  })

  describe('getTitle', () => {
    it('returns appropriate title', () => {
      const error = { category: ErrorCategory.NETWORK } as any
      const title = ErrorHandler.getTitle(error)
      expect(title).toBe('Connection Error')
    })
  })

  describe('getActionText', () => {
    it('returns appropriate action text', () => {
      const error = { category: ErrorCategory.NETWORK, retryable: true } as any
      const actionText = ErrorHandler.getActionText(error)
      expect(actionText).toBe('Retry')
    })
  })

  describe('formatValidationErrors', () => {
    it('formats validation errors', () => {
      const error = {
        category: ErrorCategory.VALIDATION,
        fields: { email: ['Invalid email'] }
      } as any
      
      const formatted = ErrorHandler.formatValidationErrors(error)
      expect(formatted).toEqual({ email: ['Invalid email'] })
    })

    it('returns null for non-validation errors', () => {
      const error = { category: ErrorCategory.NETWORK } as any
      const formatted = ErrorHandler.formatValidationErrors(error)
      expect(formatted).toBeNull()
    })
  })

  describe('shouldLog', () => {
    it('returns false for validation errors', () => {
      const error = { category: ErrorCategory.VALIDATION } as any
      expect(ErrorHandler.shouldLog(error)).toBe(false)
    })

    it('returns false for cancelled OAuth', () => {
      const error = { category: ErrorCategory.OAUTH, cancelled: true } as any
      expect(ErrorHandler.shouldLog(error)).toBe(false)
    })

    it('returns true for other errors', () => {
      const error = { category: ErrorCategory.NETWORK } as any
      expect(ErrorHandler.shouldLog(error)).toBe(true)
    })
  })

  describe('getLogLevel', () => {
    it('returns warn for network errors', () => {
      const error = { category: ErrorCategory.NETWORK } as any
      expect(ErrorHandler.getLogLevel(error)).toBe('warn')
    })

    it('returns error for authentication errors', () => {
      const error = { category: ErrorCategory.AUTHENTICATION } as any
      expect(ErrorHandler.getLogLevel(error)).toBe('error')
    })

    it('returns info for unknown errors', () => {
      const error = { category: ErrorCategory.UNKNOWN } as any
      expect(ErrorHandler.getLogLevel(error)).toBe('info')
    })
  })

  describe('createApiError', () => {
    it('creates standardized API error', () => {
      const error = ErrorHandler.createApiError(404, 'Not found')
      expect(error.category).toBe(ErrorCategory.SERVER)
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Not found')
    })
  })
})

describe('utility functions', () => {
  it('handleError processes errors', () => {
    const result = handleError({ message: 'Network connection failed' })
    expect(result.error.category).toBe(ErrorCategory.NETWORK)
    expect(result.displayConfig.type).toBe('toast')
  })

  it('getErrorMessageUtil returns user-friendly message', () => {
    const message = getErrorMessageUtil({ message: 'Network connection failed' })
    expect(message).toBe('Network connection failed. Please check your internet connection and try again.')
  })

  it('shouldRetryError checks if error should be retried', () => {
    const retryableError = { message: 'Network connection failed' }
    const nonRetryableError = { status: 400, message: 'Bad request' }
    
    expect(shouldRetryError(retryableError)).toBe(true)
    expect(shouldRetryError(nonRetryableError)).toBe(false)
  })
})