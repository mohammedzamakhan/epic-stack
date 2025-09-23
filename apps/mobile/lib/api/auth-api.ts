import {
	LoginRequest,
	LoginApiResponse,
	SignupRequest,
	SignupApiResponse,
	VerifyRequest,
	VerifyApiResponse,
	OnboardingRequest,
	OnboardingApiResponse,
	SocialAuthRequest,
	SocialAuthApiResponse,
	RefreshApiResponse,
	LogoutApiResponse,
	ApiResponse,
	OrganizationsApiResponse,
	OrganizationsApiError,
} from '@repo/types'
import { HttpClient } from './http-client'

export interface AuthApiConfig {
	baseUrl: string
	timeout?: number
	retryAttempts?: number
}

export interface AuthApiEndpoints {
	login: string
	signup: string
	verify: string
	onboarding: string
	logout: string
	refresh: string
	organizations: string
	socialAuth: (provider: string) => string
	socialCallback: (provider: string) => string
}

export class AuthApi {
	private httpClient: HttpClient
	private endpoints: AuthApiEndpoints

	constructor(config: AuthApiConfig) {
		this.httpClient = new HttpClient({
			baseUrl: config.baseUrl,
			timeout: config.timeout,
			retryAttempts: config.retryAttempts,
			defaultHeaders: {
				'Content-Type': 'application/json',
			},
		})

		// Define API endpoints - use dedicated API routes for mobile
		this.endpoints = {
			login: '/api/auth/login',
			signup: '/api/auth/signup',
			verify: '/api/auth/verify',
			onboarding: '/api/auth/onboarding',
			logout: '/api/auth/logout',
			refresh: '/api/auth/refresh',
			organizations: '/api/organizations',
			socialAuth: (provider: string) => `/api/auth/${provider}`,
			socialCallback: (provider: string) => `/api/auth/${provider}/callback`,
		}
	}

	/**
	 * Authenticates user with username/email and password
	 */
	async login(credentials: LoginRequest): Promise<LoginApiResponse> {
		try {
			// Use form data for login to match web app expectations
			const response = await this.httpClient.postForm<LoginApiResponse['data']>(
				this.endpoints.login,
				credentials,
			)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Signs up a new user with email
	 */
	async signup(signupData: SignupRequest): Promise<SignupApiResponse> {
		try {
			// Use form data for signup to match web app expectations
			const response = await this.httpClient.postForm<
				SignupApiResponse['data']
			>(this.endpoints.signup, signupData)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Verifies email with 6-digit code
	 */
	async verify(verifyData: VerifyRequest): Promise<VerifyApiResponse> {
		try {
			// Use form data for verify to match web app expectations
			const response = await this.httpClient.postForm<
				VerifyApiResponse['data']
			>(this.endpoints.verify, verifyData)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Completes onboarding with username, password, and name
	 */
	async onboarding(
		onboardingData: OnboardingRequest,
	): Promise<OnboardingApiResponse> {
		try {
			// Use form data for onboarding to match web app expectations
			const response = await this.httpClient.postForm<
				OnboardingApiResponse['data']
			>(this.endpoints.onboarding, onboardingData)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Initiates OAuth authentication with a social provider
	 */
	async socialAuth(
		provider: string,
		redirectTo?: string,
	): Promise<SocialAuthApiResponse> {
		try {
			const requestData: SocialAuthRequest = {
				provider,
				redirectTo,
			}

			const response = await this.httpClient.post<
				SocialAuthApiResponse['data']
			>(this.endpoints.socialAuth(provider), requestData)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Handles OAuth callback after provider authentication
	 * This makes a GET request to the OAuth callback endpoint with the authorization code
	 * The backend will handle the code exchange with the OAuth provider
	 */
	async socialCallback(
		provider: string,
		code: string,
		state?: string,
	): Promise<LoginApiResponse> {
		try {
			// Build the callback URL with query parameters
			// This simulates how the OAuth provider would redirect to the callback
			const params = new URLSearchParams({
				code,
			})

			if (state) {
				params.append('state', state)
			}

			const callbackUrl = `/auth/${provider}/callback?${params.toString()}`

			// Make a GET request to the callback endpoint
			// The backend will handle the OAuth code exchange
			const response = await this.httpClient.get<any>(callbackUrl)

			// The backend callback might return a redirect response or session data
			// We need to handle both cases
			if (response.success) {
				// If the response contains session data, return it
				if (response.data?.user && response.data?.session) {
					return {
						success: true,
						data: response.data,
						status: response.status,
					}
				}

				// If it's a successful response but no session data,
				// it might be a redirect to onboarding or verification
				return {
					success: true,
					data: response.data,
					status: response.status,
				}
			}

			return {
				success: false,
				error: response.error || 'oauth_callback_failed',
				message: response.message || 'OAuth callback failed',
				status: response.status,
			}
		} catch (error) {
			// Handle network errors and other exceptions
			if (error instanceof Error) {
				return {
					success: false,
					error: 'network_error',
					message: error.message,
					status: 0,
				}
			}

			return this.handleError(error as Error)
		}
	}

	/**
	 * Refreshes JWT tokens using refresh token
	 */
	async refreshTokens(
		refreshToken: string,
		userId: string,
	): Promise<RefreshApiResponse> {
		try {
			const response = await this.httpClient.post<RefreshApiResponse['data']>(
				this.endpoints.refresh,
				{ refreshToken, userId },
			)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Refreshes the current session (alias for refreshTokens for backward compatibility)
	 */
	async refreshSession(): Promise<RefreshApiResponse> {
		// This method is for backward compatibility with tests
		// In practice, refreshTokens should be used with proper parameters
		return {
			success: false,
			error: 'missing_parameters',
			message:
				'refreshSession requires refreshToken and userId parameters. Use refreshTokens instead.',
			status: 400,
		}
	}

	/**
	 * Logs out the current user
	 */
	async logout(refreshToken?: string): Promise<LogoutApiResponse> {
		try {
			const response = await this.httpClient.post<LogoutApiResponse['data']>(
				this.endpoints.logout,
				{ refreshToken },
			)

			if (!response.success) {
				return {
					success: false,
					error: response.error,
					message: response.message,
					status: response.status,
				}
			}

			return {
				success: true,
				data: response.data,
				status: response.status,
			}
		} catch (error) {
			return this.handleError(error as Error)
		}
	}

	/**
	 * Fetches user organizations
	 */
	async getOrganizations(): Promise<
		OrganizationsApiResponse | OrganizationsApiError
	> {
		try {
			const response = await this.httpClient.get<
				OrganizationsApiResponse['data']
			>(this.endpoints.organizations)

			if (!response.success) {
				return {
					success: false,
					error: response.error || 'unknown_error',
					message: response.message || 'Failed to fetch organizations',
					status: response.status,
				}
			}

			return {
				success: true,
				data: {
					organizations: response.data?.organizations || [],
				},
				status: response.status,
			}
		} catch (error) {
			return {
				success: false,
				error: 'network_error',
				message:
					error instanceof Error ? error.message : 'Network error occurred',
				status: 0,
			}
		}
	}

	/**
	 * Sets the authorization header for authenticated requests
	 */
	setAuthToken(token: string): void {
		this.httpClient.setDefaultHeader('Authorization', `Bearer ${token}`)
	}

	/**
	 * Removes the authorization header
	 */
	clearAuthToken(): void {
		this.httpClient.removeDefaultHeader('Authorization')
	}

	/**
	 * Updates the base URL (useful for switching environments)
	 */
	updateBaseUrl(baseUrl: string): void {
		// Create a new HTTP client with the updated base URL
		const currentConfig = this.httpClient.getConfig()
		this.httpClient = new HttpClient({
			...currentConfig,
			baseUrl,
		})
	}

	/**
	 * Gets the current HTTP client configuration
	 */
	getConfig(): AuthApiConfig {
		const config = this.httpClient.getConfig()
		return {
			baseUrl: config.baseUrl,
			timeout: config.timeout,
			retryAttempts: config.retryAttempts,
		}
	}

	/**
	 * Handles errors and converts them to API response format
	 */
	private handleError(error: Error): ApiResponse {
		return {
			success: false,
			error: 'network_error',
			message: error.message || 'An unexpected error occurred',
			status: 0,
		}
	}
}

/**
 * Creates a new AuthApi instance
 */
export function createAuthApi(config: AuthApiConfig): AuthApi {
	return new AuthApi(config)
}

/**
 * Default AuthApi instance factory with common configuration
 */
export function createDefaultAuthApi(baseUrl: string): AuthApi {
	return createAuthApi({
		baseUrl,
		timeout: 10000, // 10 seconds
		retryAttempts: 3,
	})
}

/**
 * OAuth provider names supported by the API
 */
export const SUPPORTED_OAUTH_PROVIDERS = ['github', 'google'] as const
export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number]

/**
 * Validates if a provider is supported
 */
export function isSupportedOAuthProvider(
	provider: string,
): provider is SupportedOAuthProvider {
	return SUPPORTED_OAUTH_PROVIDERS.includes(provider as SupportedOAuthProvider)
}

/**
 * OAuth provider configuration for mobile apps
 */
export interface OAuthProviderConfig {
	name: SupportedOAuthProvider
	displayName: string
	iconName: string
	authUrl: string
	callbackUrl: string
}

/**
 * OAuth provider configurations
 */
export const OAUTH_PROVIDER_CONFIGS: Record<
	SupportedOAuthProvider,
	OAuthProviderConfig
> = {
	github: {
		name: 'github',
		displayName: 'GitHub',
		iconName: 'github',
		authUrl: '/auth/github',
		callbackUrl: '/auth/github/callback',
	},
	google: {
		name: 'google',
		displayName: 'Google',
		iconName: 'google',
		authUrl: '/auth/google',
		callbackUrl: '/auth/google/callback',
	},
}

/**
 * Gets OAuth provider configuration by name
 */
export function getOAuthProviderConfig(
	provider: string,
): OAuthProviderConfig | null {
	if (!isSupportedOAuthProvider(provider)) {
		return null
	}
	return OAUTH_PROVIDER_CONFIGS[provider]
}

/**
 * Default auth API instance for backward compatibility
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
export const authApi = createDefaultAuthApi(API_BASE_URL)
