import { ErrorCategory, AppErrorType, NetworkError, AuthenticationError, ValidationError, OAuthError, RateLimitError, BotDetectionError, ServerError } from './types'

// HTTP status code mappings
const STATUS_CODE_MAPPINGS: Record<number, ErrorCategory> = {
  400: ErrorCategory.VALIDATION,
  401: ErrorCategory.AUTHENTICATION,
  403: ErrorCategory.BOT_DETECTION,
  404: ErrorCategory.SERVER,
  409: ErrorCategory.VALIDATION,
  422: ErrorCategory.VALIDATION,
  429: ErrorCategory.RATE_LIMIT,
  500: ErrorCategory.SERVER,
  502: ErrorCategory.SERVER,
  503: ErrorCategory.SERVER,
  504: ErrorCategory.SERVER,
}

// Error message patterns for categorization
const ERROR_PATTERNS: Record<ErrorCategory, RegExp[]> = {
  [ErrorCategory.NETWORK]: [
    /network/i,
    /connection/i,
    /timeout/i,
    /offline/i,
    /fetch/i,
    /ENOTFOUND/i,
    /ECONNREFUSED/i,
  ],
  [ErrorCategory.AUTHENTICATION]: [
    /invalid.*credentials/i,
    /unauthorized/i,
    /authentication.*failed/i,
    /login.*failed/i,
    /banned/i,
    /suspended/i,
    /account.*disabled/i,
  ],
  [ErrorCategory.VALIDATION]: [
    /validation/i,
    /invalid.*email/i,
    /invalid.*password/i,
    /required.*field/i,
    /missing.*field/i,
    /format.*invalid/i,
  ],
  [ErrorCategory.OAUTH]: [
    /oauth/i,
    /social.*login/i,
    /provider.*error/i,
    /authorization.*failed/i,
    /cancelled.*by.*user/i,
  ],
  [ErrorCategory.RATE_LIMIT]: [
    /rate.*limit/i,
    /too.*many.*requests/i,
    /quota.*exceeded/i,
  ],
  [ErrorCategory.BOT_DETECTION]: [
    /bot.*detected/i,
    /forbidden/i,
    /access.*denied/i,
    /suspicious.*activity/i,
  ],
  [ErrorCategory.SERVER]: [
    /server.*error/i,
    /internal.*error/i,
    /service.*unavailable/i,
    /maintenance/i,
  ],
  [ErrorCategory.UNKNOWN]: [],
}

/**
 * Categorizes an error based on status code, message, and other properties
 */
export function categorizeError(error: any): AppErrorType {
  const statusCode = error.status || error.statusCode || error.response?.status
  const message = error.message || error.error || error.description || 'Unknown error'
  const originalError = error instanceof Error ? error : undefined

  // First, try to categorize by status code
  if (statusCode && STATUS_CODE_MAPPINGS[statusCode]) {
    const category = STATUS_CODE_MAPPINGS[statusCode]
    return createErrorByCategory(category, message, originalError, statusCode)
  }

  // Then, try to categorize by message patterns
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(message))) {
      return createErrorByCategory(category as ErrorCategory, message, originalError, statusCode)
    }
  }

  // Default to unknown category
  return createErrorByCategory(ErrorCategory.UNKNOWN, message, originalError, statusCode)
}

/**
 * Creates a specific error type based on category
 */
function createErrorByCategory(
  category: ErrorCategory,
  message: string,
  originalError?: Error,
  statusCode?: number
): AppErrorType {
  const baseError = {
    message,
    originalError,
    statusCode,
    code: generateErrorCode(category, statusCode),
  }

  switch (category) {
    case ErrorCategory.NETWORK:
      return {
        ...baseError,
        category: ErrorCategory.NETWORK,
        timeout: /timeout/i.test(message),
        offline: /offline|network/i.test(message),
        retryable: true,
      } as NetworkError

    case ErrorCategory.AUTHENTICATION:
      return {
        ...baseError,
        category: ErrorCategory.AUTHENTICATION,
        banned: /banned/i.test(message),
        suspended: /suspended/i.test(message),
        retryable: false,
      } as AuthenticationError

    case ErrorCategory.VALIDATION:
      return {
        ...baseError,
        category: ErrorCategory.VALIDATION,
        retryable: false,
      } as ValidationError

    case ErrorCategory.OAUTH:
      return {
        ...baseError,
        category: ErrorCategory.OAUTH,
        cancelled: /cancelled/i.test(message),
        retryable: true,
      } as OAuthError

    case ErrorCategory.RATE_LIMIT:
      return {
        ...baseError,
        category: ErrorCategory.RATE_LIMIT,
        retryAfter: extractRetryAfter(message),
        retryable: true,
      } as RateLimitError

    case ErrorCategory.BOT_DETECTION:
      return {
        ...baseError,
        category: ErrorCategory.BOT_DETECTION,
        retryable: false,
      } as BotDetectionError

    case ErrorCategory.SERVER:
      return {
        ...baseError,
        category: ErrorCategory.SERVER,
        maintenance: /maintenance/i.test(message),
        retryable: statusCode !== 404,
      } as ServerError

    default:
      return {
        ...baseError,
        category: ErrorCategory.SERVER,
        retryable: false,
      } as ServerError
  }
}

/**
 * Generates a unique error code based on category and status code
 */
function generateErrorCode(category: ErrorCategory, statusCode?: number): string {
  const categoryCode = category.toUpperCase().replace('_', '')
  const status = statusCode ? `_${statusCode}` : ''
  return `${categoryCode}${status}`
}

/**
 * Extracts retry-after value from error message or headers
 */
function extractRetryAfter(message: string): number | undefined {
  const match = message.match(/retry.*after.*(\d+)/i)
  return match ? parseInt(match[1], 10) : undefined
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: AppErrorType): boolean {
  return error.retryable === true
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: AppErrorType): error is NetworkError {
  return error.category === ErrorCategory.NETWORK
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthenticationError(error: AppErrorType): error is AuthenticationError {
  return error.category === ErrorCategory.AUTHENTICATION
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(error: AppErrorType): error is ValidationError {
  return error.category === ErrorCategory.VALIDATION
}