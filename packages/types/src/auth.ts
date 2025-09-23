// Base User type based on Prisma schema
export interface User {
	id: string
	email: string
	username: string
	name: string | null
	createdAt: string
	updatedAt: string
	isBanned: boolean
	banReason: string | null
	banExpiresAt: string | null
	bannedAt: string | null
	image?: {
		id: string
		altText: string | null
		objectKey: string
	} | null
}

// Session data for authentication
export interface SessionData {
	id: string
	userId: string
	expirationDate: string
	createdAt: string
	updatedAt: string
}

// Authentication state for client-side state management
export interface AuthState {
	user: User | null
	session: SessionData | null
	isAuthenticated: boolean
	isLoading: boolean
	error: string | null
}

// Login credentials
export interface LoginCredentials {
	username: string
	password: string
	redirectTo?: string
	remember?: boolean
}

// Signup data
export interface SignupData {
	email: string
	redirectTo?: string
}

// OAuth provider names
export type ProviderName = 'github' | 'google' | 'discord'

// OAuth authentication data
export interface SocialAuthData {
	provider: ProviderName
	redirectTo?: string
}

// OAuth callback data
export interface OAuthCallbackData {
	code: string
	state?: string
	error?: string
	error_description?: string
}

// API Response types
export interface AuthResponse {
	success: boolean
	user?: User
	session?: SessionData
	redirectTo?: string
	error?: string
	message?: string
}

export interface LoginResponse extends AuthResponse {
	requiresTwoFactor?: boolean
}

export interface SignupResponse extends AuthResponse {
	verificationRequired?: boolean
}

export interface SocialAuthResponse extends AuthResponse {
	authUrl?: string
}

// Error types
export interface AuthError {
	type:
		| 'validation'
		| 'authentication'
		| 'network'
		| 'server'
		| 'banned'
		| 'rate_limit'
		| 'bot_detection'
	message: string
	field?: string
	details?: Record<string, any>
}

// Connection/Provider data for OAuth
export interface Connection {
	id: string
	providerId: string
	providerName: ProviderName
	userId: string
	createdAt: string
	updatedAt: string
}

// Provider user data from OAuth
export interface ProviderUser {
	id: string
	email: string
	username?: string
	name?: string
	imageUrl?: string
	provider: ProviderName
}

// Mobile-specific types for simplified authentication
export interface MobileAuthState extends Omit<AuthState, 'error'> {
	errors: string[]
	networkError: boolean
}

export interface MobileLoginCredentials {
	username: string
	password: string
	redirectTo?: string
	remember?: boolean
}

export interface MobileSignupData {
	email: string
}

// API client configuration
export interface AuthApiConfig {
	baseUrl: string
	timeout?: number
	retryAttempts?: number
	headers?: Record<string, string>
}

// Session storage interface
export interface SessionStorage {
	getSession(): Promise<SessionData | null>
	setSession(session: SessionData): Promise<void>
	clearSession(): Promise<void>
	isSessionValid(session: SessionData): boolean
}

// Authentication context type for React Context
export interface AuthContextType {
	// State
	user: User | null
	session: SessionData | null
	isAuthenticated: boolean
	isLoading: boolean
	error: string | null

	// Actions
	login: (credentials: LoginCredentials) => Promise<AuthResponse>
	signup: (data: SignupData) => Promise<AuthResponse>
	socialLogin: (data: SocialAuthData) => Promise<AuthResponse>
	logout: () => Promise<void>
	refreshSession: () => Promise<void>
	clearError: () => void
}

// Verification types
export interface VerificationData {
	id: string
	type: string
	target: string
	expiresAt: string | null
	createdAt: string
}

// Two-factor authentication types
export interface TwoFactorData {
	required: boolean
	verified: boolean
	verificationId?: string
}

// Enhanced auth response with 2FA support
export interface EnhancedAuthResponse extends AuthResponse {
	twoFactor?: TwoFactorData
	verification?: VerificationData
}
