import { AppErrorType, ErrorDisplayConfig, ErrorCategory } from './types'
import { categorizeError } from './categorizer'
import { getErrorMessage, getErrorActionText, getErrorTitle, formatValidationErrors } from './messages'
import { shouldShowRetryButton, getRateLimitRetryDelay } from './retry'

/**
 * Main error handler class that processes errors and determines display strategy
 */
export class ErrorHandler {
  /**
   * Processes any error and returns a categorized error with display configuration
   */
  static handle(error: any): { error: AppErrorType; displayConfig: ErrorDisplayConfig } {
    const categorizedError = categorizeError(error)
    const displayConfig = this.getDisplayConfig(categorizedError)
    
    return {
      error: categorizedError,
      displayConfig,
    }
  }

  /**
   * Gets the appropriate display configuration for an error
   */
  private static getDisplayConfig(error: AppErrorType): ErrorDisplayConfig {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return {
          type: 'toast',
          duration: 4000,
          dismissible: true,
          actionText: shouldShowRetryButton(error) ? 'Retry' : undefined,
        }

      case ErrorCategory.AUTHENTICATION:
        if ('banned' in error && error.banned) {
          return {
            type: 'modal',
            dismissible: false,
            actionText: 'Contact Support',
          }
        }
        if ('suspended' in error && error.suspended) {
          return {
            type: 'banner',
            persistent: true,
            dismissible: false,
            actionText: 'Contact Support',
          }
        }
        return {
          type: 'toast',
          duration: 5000,
          dismissible: true,
        }

      case ErrorCategory.VALIDATION:
        return {
          type: 'inline',
          dismissible: false,
        }

      case ErrorCategory.OAUTH:
        if ('cancelled' in error && error.cancelled) {
          return {
            type: 'toast',
            duration: 3000,
            dismissible: true,
          }
        }
        return {
          type: 'toast',
          duration: 4000,
          dismissible: true,
          actionText: 'Retry',
        }

      case ErrorCategory.RATE_LIMIT:
        const retryDelay = getRateLimitRetryDelay(error)
        return {
          type: 'banner',
          persistent: true,
          dismissible: true,
          actionText: retryDelay > 0 ? `Retry in ${Math.ceil(retryDelay / 1000)}s` : 'Retry Later',
        }

      case ErrorCategory.BOT_DETECTION:
        return {
          type: 'modal',
          dismissible: true,
          actionText: 'Contact Support',
        }

      case ErrorCategory.SERVER:
        if ('maintenance' in error && error.maintenance) {
          return {
            type: 'banner',
            persistent: true,
            dismissible: false,
          }
        }
        return {
          type: 'toast',
          duration: 5000,
          dismissible: true,
          actionText: shouldShowRetryButton(error) ? 'Retry' : undefined,
        }

      default:
        return {
          type: 'toast',
          duration: 4000,
          dismissible: true,
        }
    }
  }

  /**
   * Gets a user-friendly error message
   */
  static getMessage(error: AppErrorType): string {
    return getErrorMessage(error)
  }

  /**
   * Gets an error title for display
   */
  static getTitle(error: AppErrorType): string {
    return getErrorTitle(error)
  }

  /**
   * Gets action text for an error
   */
  static getActionText(error: AppErrorType): string | undefined {
    return getErrorActionText(error)
  }

  /**
   * Formats validation errors for form display
   */
  static formatValidationErrors(error: AppErrorType): Record<string, string[]> | null {
    if (error.category === ErrorCategory.VALIDATION) {
      return formatValidationErrors(error as any)
    }
    return null
  }

  /**
   * Checks if an error should be logged to crash reporting
   */
  static shouldLog(error: AppErrorType): boolean {
    // Don't log validation errors or user-cancelled OAuth
    if (error.category === ErrorCategory.VALIDATION) {
      return false
    }
    
    if (error.category === ErrorCategory.OAUTH && 'cancelled' in error && error.cancelled) {
      return false
    }

    // Log all other errors
    return true
  }

  /**
   * Gets log level for an error
   */
  static getLogLevel(error: AppErrorType): 'error' | 'warn' | 'info' {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return 'warn'
      case ErrorCategory.RATE_LIMIT:
        return 'warn'
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.BOT_DETECTION:
      case ErrorCategory.SERVER:
        return 'error'
      default:
        return 'info'
    }
  }

  /**
   * Creates a standardized error object for API responses
   */
  static createApiError(statusCode: number, message: string, details?: any): AppErrorType {
    return categorizeError({
      status: statusCode,
      message,
      details,
    })
  }
}

/**
 * Utility function to handle errors in a consistent way
 */
export function handleError(error: any): { error: AppErrorType; displayConfig: ErrorDisplayConfig } {
  return ErrorHandler.handle(error)
}

/**
 * Utility function to get error message
 */
export function getErrorMessageUtil(error: any): string {
  const categorizedError = categorizeError(error)
  return ErrorHandler.getMessage(categorizedError)
}

/**
 * Utility function to check if error should be retried
 */
export function shouldRetryError(error: any): boolean {
  const categorizedError = categorizeError(error)
  return shouldShowRetryButton(categorizedError)
}