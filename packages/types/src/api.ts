import { type User, type SessionData } from './auth.js'

// Base API response structure
export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
    status: number
}

// Paginated response structure
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

// API error response
export interface ApiError {
    type: string
    message: string
    field?: string
    code?: string
    details?: Record<string, any>
}

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// Request configuration
export interface RequestConfig {
    method?: HttpMethod
    headers?: Record<string, string>
    body?: any
    timeout?: number
    retries?: number
    signal?: AbortSignal
}

// Authentication API endpoints
export interface AuthApiEndpoints {
    login: '/auth/login'
    signup: '/auth/signup'
    logout: '/auth/logout'
    refresh: '/auth/refresh'
    verify: '/auth/verify'
    forgotPassword: '/auth/forgot-password'
    resetPassword: '/auth/reset-password'
    socialAuth: (provider: string) => string
    socialCallback: (provider: string) => string
}

// Login API request
export interface LoginRequest {
    username: string
    password: string
    remember?: boolean
    redirectTo?: string
}

// Login API response
export interface LoginApiResponse extends ApiResponse {
    data?: {
        user: {
            id: string
            email: string
            username: string
            name: string | null
            image?: {
                id: string
                altText: string | null
                objectKey: string
            } | null
        }
        session: {
            id: string
            expirationDate: string
        }
        requiresTwoFactor?: boolean
    }
    redirectTo?: string
}

// JWT Login API response (for mobile apps)
export interface JWTLoginApiResponse extends ApiResponse {
    data?: {
        data: {
            user: {
                id: string
                email: string
                username: string
                name: string | null
                image?: string | null
                createdAt: string
                updatedAt: string
            }
            
        }
        accessToken: string
            refreshToken: string
            expiresIn: number
            expiresAt: string
    }
    redirectTo?: string
}

// Signup API request
export interface SignupRequest {
    email: string
    redirectTo?: string
}

// Signup API response
export interface SignupApiResponse extends ApiResponse {
    data?: {
        email: string
        verificationRequired: boolean
        verifyUrl?: string
        redirectTo?: string
    }
}

// Verify API request
export interface VerifyRequest {
    code: string
    type: 'onboarding' | 'reset-password' | 'change-email' | '2fa'
    target: string
    redirectTo?: string
}

// Verify API response
export interface VerifyApiResponse extends ApiResponse {
    data?: {
        verified: boolean
        redirectTo?: string
        message?: string
    }
}

// Onboarding API request
export interface OnboardingRequest {
    email?: string // Optional for mobile apps that pass email directly
    username: string
    name: string
    password: string
    confirmPassword: string
    agreeToTermsOfServiceAndPrivacyPolicy: boolean
    remember?: boolean
    redirectTo?: string
}

// Onboarding API response
export interface OnboardingApiResponse extends ApiResponse {
    data?: {
        user: User
        session: SessionData
    }
}

// JWT Onboarding API response (for mobile apps)
export interface JWTOnboardingApiResponse extends ApiResponse {
    data?: {
        user: {
            id: string
            email: string
            username: string
            name: string | null
            image?: string | null
            createdAt: string
            updatedAt: string
        }
        accessToken: string
        refreshToken: string
        expiresIn: number
        expiresAt: string
    }
}

// Social auth API request
export interface SocialAuthRequest {
    provider: string
    redirectTo?: string
}

// Social auth API response
export interface SocialAuthApiResponse extends ApiResponse {
    data?: {
        authUrl: string
        state: string
    }
}

// OAuth callback API request
export interface OAuthCallbackRequest {
    code: string
    state?: string
    provider: string
}

// OAuth callback API response
export interface OAuthCallbackApiResponse extends LoginApiResponse { }

// JWT OAuth callback API response (for mobile apps)
export interface JWTOAuthCallbackApiResponse extends JWTLoginApiResponse { }

// Refresh session API response
export interface RefreshApiResponse extends ApiResponse {
    data?: {
        session: {
            id: string
            expirationDate: string
        }
    }
}

// JWT Refresh API response (for mobile apps)
export interface JWTRefreshApiResponse extends ApiResponse {
    data?: {
        user?: {
            id: string
            email: string
            username: string
            name: string | null
            image?: string | null
            createdAt: string
            updatedAt: string
        }
        accessToken: string
        refreshToken: string
        expiresIn: number
        expiresAt: string
    }
}

// Logout API response
export interface LogoutApiResponse extends ApiResponse { }

// Verification API request
export interface VerificationRequest {
    type: string
    target: string
    code: string
    redirectTo?: string
}

// Verification API response
export interface VerificationApiResponse extends ApiResponse {
    data?: {
        verified: boolean
        redirectTo?: string
    }
}

// Forgot password API request
export interface ForgotPasswordRequest {
    email: string
}

// Forgot password API response
export interface ForgotPasswordApiResponse extends ApiResponse {
    data?: {
        emailSent: boolean
    }
}

// Reset password API request
export interface ResetPasswordRequest {
    token: string
    password: string
    confirmPassword: string
}

// Reset password API response
export interface ResetPasswordApiResponse extends ApiResponse {
    data?: {
        success: boolean
    }
}

// Network error types
export interface NetworkError {
    type: 'timeout' | 'network' | 'abort' | 'unknown'
    message: string
    originalError?: Error
}

// Rate limiting response
export interface RateLimitResponse extends ApiResponse {
    error: 'rate_limit_exceeded'
    retryAfter?: number
    limit?: number
    remaining?: number
    resetTime?: string
}

// Bot detection response
export interface BotDetectionResponse extends ApiResponse {
    error: 'bot_detected'
    message: 'Request blocked due to bot detection'
}

// Validation error response
export interface ValidationErrorResponse extends ApiResponse {
    error: 'validation_error'
    errors: Array<{
        field: string
        message: string
        code?: string
    }>
}

// Server error response
export interface ServerErrorResponse extends ApiResponse {
    error: 'server_error'
    message: string
    requestId?: string
}