import {
	ErrorCategory,
	AppErrorType,
	NetworkError,
	AuthenticationError,
	ValidationError,
	OAuthError,
	RateLimitError,
	ServerError,
} from './types'

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorCategory, Record<string, string>> = {
	[ErrorCategory.NETWORK]: {
		default:
			'Network connection failed. Please check your internet connection and try again.',
		timeout: 'Request timed out. Please try again.',
		offline: 'You appear to be offline. Please check your internet connection.',
		connection_refused:
			'Unable to connect to the server. Please try again later.',
	},
	[ErrorCategory.AUTHENTICATION]: {
		default:
			'Authentication failed. Please check your credentials and try again.',
		invalid_credentials: 'Invalid username or password. Please try again.',
		banned:
			'Your account has been suspended. Please contact support for assistance.',
		suspended: 'Your account is temporarily suspended. Please contact support.',
		unauthorized: 'You are not authorized to access this resource.',
	},
	[ErrorCategory.VALIDATION]: {
		default: 'Please check your input and try again.',
		invalid_email: 'Please enter a valid email address.',
		invalid_password: 'Password does not meet requirements.',
		required_field: 'This field is required.',
		email_exists: 'An account with this email already exists.',
	},
	[ErrorCategory.OAUTH]: {
		default: 'Social login failed. Please try again.',
		cancelled: 'Login was cancelled. Please try again if you want to continue.',
		provider_error:
			'There was an error with the login provider. Please try again.',
		authorization_failed: 'Authorization failed. Please try again.',
	},
	[ErrorCategory.RATE_LIMIT]: {
		default: 'Too many requests. Please wait a moment and try again.',
		quota_exceeded: 'Request limit exceeded. Please try again later.',
	},
	[ErrorCategory.BOT_DETECTION]: {
		default:
			'Access denied. If you believe this is an error, please contact support.',
		suspicious_activity:
			'Suspicious activity detected. Please try again later.',
	},
	[ErrorCategory.SERVER]: {
		default: 'Server error occurred. Please try again later.',
		maintenance:
			'The service is currently under maintenance. Please try again later.',
		not_found: 'The requested resource was not found.',
		internal_error:
			'An internal server error occurred. Please try again later.',
	},
	[ErrorCategory.UNKNOWN]: {
		default: 'An unexpected error occurred. Please try again.',
	},
}

/**
 * Gets a user-friendly error message for an error
 */
export function getErrorMessage(error: AppErrorType): string {
	const categoryMessages = ERROR_MESSAGES[error.category]

	// Try to find a specific message based on error properties
	const specificMessage = getSpecificMessage(error, categoryMessages)
	if (specificMessage) {
		return specificMessage
	}

	// Fall back to default message for the category
	return (
		categoryMessages.default || ERROR_MESSAGES[ErrorCategory.UNKNOWN].default
	)
}

/**
 * Gets a specific error message based on error properties
 */
function getSpecificMessage(
	error: AppErrorType,
	messages: Record<string, string>,
): string | null {
	switch (error.category) {
		case ErrorCategory.NETWORK:
			const networkError = error as NetworkError
			if (networkError.timeout && messages.timeout) return messages.timeout
			if (networkError.offline && messages.offline) return messages.offline
			if (
				error.message.includes('ECONNREFUSED') &&
				messages.connection_refused
			) {
				return messages.connection_refused
			}
			break

		case ErrorCategory.AUTHENTICATION:
			const authError = error as AuthenticationError
			if (authError.banned && messages.banned) return messages.banned
			if (authError.suspended && messages.suspended) return messages.suspended
			if (error.message.includes('invalid') && messages.invalid_credentials) {
				return messages.invalid_credentials
			}
			if (error.statusCode === 401 && messages.unauthorized)
				return messages.unauthorized
			break

		case ErrorCategory.VALIDATION:
			if (error.message.includes('email') && messages.invalid_email)
				return messages.invalid_email
			if (error.message.includes('password') && messages.invalid_password)
				return messages.invalid_password
			if (error.message.includes('required') && messages.required_field)
				return messages.required_field
			if (error.message.includes('exists') && messages.email_exists)
				return messages.email_exists
			break

		case ErrorCategory.OAUTH:
			const oauthError = error as OAuthError
			if (oauthError.cancelled && messages.cancelled) return messages.cancelled
			if (error.message.includes('provider') && messages.provider_error)
				return messages.provider_error
			if (
				error.message.includes('authorization') &&
				messages.authorization_failed
			) {
				return messages.authorization_failed
			}
			break

		case ErrorCategory.RATE_LIMIT:
			if (error.message.includes('quota') && messages.quota_exceeded)
				return messages.quota_exceeded
			break

		case ErrorCategory.BOT_DETECTION:
			if (
				error.message.includes('suspicious') &&
				messages.suspicious_activity
			) {
				return messages.suspicious_activity
			}
			break

		case ErrorCategory.SERVER:
			const serverError = error as ServerError
			if (serverError.maintenance && messages.maintenance)
				return messages.maintenance
			if (error.statusCode === 404 && messages.not_found)
				return messages.not_found
			if (error.statusCode === 500 && messages.internal_error)
				return messages.internal_error
			break
	}

	return null
}

/**
 * Gets an action text for an error (e.g., "Retry", "Contact Support")
 */
export function getErrorActionText(error: AppErrorType): string | undefined {
	switch (error.category) {
		case ErrorCategory.NETWORK:
		case ErrorCategory.OAUTH:
			return 'Retry'

		case ErrorCategory.RATE_LIMIT:
			const rateLimitError = error as RateLimitError
			if (rateLimitError.retryAfter) {
				return `Retry in ${rateLimitError.retryAfter}s`
			}
			return 'Retry Later'

		case ErrorCategory.AUTHENTICATION:
			const authError = error as AuthenticationError
			if (authError.banned || authError.suspended) {
				return 'Contact Support'
			}
			return undefined

		case ErrorCategory.SERVER:
			const serverError = error as ServerError
			if (serverError.maintenance) {
				return undefined
			}
			return 'Retry'

		case ErrorCategory.BOT_DETECTION:
			return 'Contact Support'

		default:
			return error.retryable ? 'Retry' : undefined
	}
}

/**
 * Formats validation errors for form display
 */
export function formatValidationErrors(
	error: ValidationError,
): Record<string, string[]> {
	if (error.fields) {
		return error.fields
	}

	// If we have a field-specific error, create a fields object
	if (error.field) {
		return {
			[error.field]: [error.message],
		}
	}

	// For general validation errors, return as a general error
	return {
		general: [error.message],
	}
}

/**
 * Gets a short error title for display
 */
export function getErrorTitle(error: AppErrorType): string {
	switch (error.category) {
		case ErrorCategory.NETWORK:
			return 'Connection Error'
		case ErrorCategory.AUTHENTICATION:
			return 'Authentication Error'
		case ErrorCategory.VALIDATION:
			return 'Validation Error'
		case ErrorCategory.OAUTH:
			return 'Login Error'
		case ErrorCategory.RATE_LIMIT:
			return 'Rate Limit Exceeded'
		case ErrorCategory.BOT_DETECTION:
			return 'Access Denied'
		case ErrorCategory.SERVER:
			return 'Server Error'
		default:
			return 'Error'
	}
}
