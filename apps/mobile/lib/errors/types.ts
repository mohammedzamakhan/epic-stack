// Error categories for different types of errors
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  OAUTH = 'oauth',
  RATE_LIMIT = 'rate_limit',
  BOT_DETECTION = 'bot_detection',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

// Base error interface
export interface AppError {
  category: ErrorCategory
  code: string
  message: string
  originalError?: Error
  retryable?: boolean
  statusCode?: number
}

// Network error types
export interface NetworkError extends AppError {
  category: ErrorCategory.NETWORK
  timeout?: boolean
  offline?: boolean
}

// Authentication error types
export interface AuthenticationError extends AppError {
  category: ErrorCategory.AUTHENTICATION
  banned?: boolean
  suspended?: boolean
}

// Validation error types
export interface ValidationError extends AppError {
  category: ErrorCategory.VALIDATION
  field?: string
  fields?: Record<string, string[]>
}

// OAuth error types
export interface OAuthError extends AppError {
  category: ErrorCategory.OAUTH
  provider?: string
  cancelled?: boolean
}

// Rate limiting error types
export interface RateLimitError extends AppError {
  category: ErrorCategory.RATE_LIMIT
  retryAfter?: number
}

// Bot detection error types
export interface BotDetectionError extends AppError {
  category: ErrorCategory.BOT_DETECTION
}

// Server error types
export interface ServerError extends AppError {
  category: ErrorCategory.SERVER
  maintenance?: boolean
}

// Union type for all error types
export type AppErrorType = 
  | NetworkError
  | AuthenticationError
  | ValidationError
  | OAuthError
  | RateLimitError
  | BotDetectionError
  | ServerError

// Error display configuration
export interface ErrorDisplayConfig {
  type: 'toast' | 'banner' | 'modal' | 'inline'
  duration?: number
  dismissible?: boolean
  persistent?: boolean
  actionText?: string
  onAction?: () => void
}