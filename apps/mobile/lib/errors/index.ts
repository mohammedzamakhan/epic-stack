// Types
export type {
  AppError,
  AppErrorType,
  NetworkError,
  AuthenticationError,
  ValidationError,
  OAuthError,
  RateLimitError,
  BotDetectionError,
  ServerError,
  ErrorDisplayConfig,
} from './types'

export { ErrorCategory } from './types'

// Categorization
export {
  categorizeError,
  isRetryableError,
  isNetworkError,
  isAuthenticationError,
  isValidationError,
} from './categorizer'

// Messages
export {
  getErrorMessage,
  getErrorActionText,
  getErrorTitle,
  formatValidationErrors,
} from './messages'

// Retry logic
export {
  RetryManager,
  createNetworkRetryManager,
  createAuthRetryManager,
  withRetry,
  shouldShowRetryButton,
  getRateLimitRetryDelay,
} from './retry'

export type { RetryConfig, RetryState } from './retry'

// Main handler
export {
  ErrorHandler,
  handleError,
  getErrorMessageUtil,
  shouldRetryError,
} from './handler'