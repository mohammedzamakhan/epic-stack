import {
	AuthApi,
	createAuthApi,
	createDefaultAuthApi,
	isSupportedOAuthProvider,
	getOAuthProviderConfig,
	SUPPORTED_OAUTH_PROVIDERS,
} from '../auth-api'
import { HttpClient } from '../http-client'

// Mock the HttpClient
jest.mock('../http-client')
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>

describe('AuthApi', () => {
	let authApi: AuthApi
	let mockHttpClient: jest.Mocked<HttpClient>

	beforeEach(() => {
		mockHttpClient = {
			post: jest.fn(),
			get: jest.fn(),
			put: jest.fn(),
			delete: jest.fn(),
			setDefaultHeader: jest.fn(),
			removeDefaultHeader: jest.fn(),
			getConfig: jest.fn().mockReturnValue({
				baseUrl: 'https://api.example.com',
				timeout: 10000,
				retryAttempts: 3,
			}),
		} as any

		MockedHttpClient.mockImplementation(() => mockHttpClient)

		authApi = createAuthApi({
			baseUrl: 'https://api.example.com',
			timeout: 5000,
			retryAttempts: 2,
		})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('constructor and configuration', () => {
		it('should create AuthApi with custom configuration', () => {
			const config = authApi.getConfig()
			expect(config).toEqual({
				baseUrl: 'https://api.example.com',
				timeout: 10000, // From mocked getConfig
				retryAttempts: 3, // From mocked getConfig
			})
		})

		it('should create default AuthApi', () => {
			const defaultApi = createDefaultAuthApi('https://api.example.com')
			expect(defaultApi).toBeInstanceOf(AuthApi)
		})
	})

	describe('login', () => {
		it('should make successful login request', async () => {
			const credentials = {
				username: 'testuser',
				password: 'password123',
				remember: true,
			}

			const mockResponse = {
				success: true,
				data: {
					user: {
						id: '1',
						email: 'test@example.com',
						username: 'testuser',
						name: 'Test User',
					},
					session: {
						id: 'session-1',
						expirationDate: '2024-12-31T23:59:59Z',
					},
				},
				status: 200,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.login(credentials)

			expect(mockHttpClient.post).toHaveBeenCalledWith('/login', credentials)
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle login failure', async () => {
			const credentials = {
				username: 'testuser',
				password: 'wrongpassword',
			}

			const mockResponse = {
				success: false,
				error: 'invalid_credentials',
				message: 'Invalid username or password',
				status: 401,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.login(credentials)

			expect(result).toEqual({
				success: false,
				error: 'invalid_credentials',
				message: 'Invalid username or password',
				status: 401,
			})
		})

		it('should handle network errors', async () => {
			const credentials = {
				username: 'testuser',
				password: 'password123',
			}

			mockHttpClient.post.mockRejectedValueOnce(new Error('Network error'))

			const result = await authApi.login(credentials)

			expect(result).toEqual({
				success: false,
				error: 'network_error',
				message: 'Network error',
				status: 0,
			})
		})
	})

	describe('signup', () => {
		it('should make successful signup request', async () => {
			const signupData = {
				email: 'newuser@example.com',
				redirectTo: '/dashboard',
			}

			const mockResponse = {
				success: true,
				data: {
					email: 'newuser@example.com',
					verificationRequired: true,
					verifyUrl: '/verify?type=onboarding&target=newuser%40example.com',
				},
				status: 200,
			}

			mockHttpClient.postForm.mockResolvedValueOnce(mockResponse)

			const result = await authApi.signup(signupData)

			expect(mockHttpClient.postForm).toHaveBeenCalledWith(
				'/api/auth/signup',
				signupData,
			)
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle signup with existing email', async () => {
			const signupData = {
				email: 'existing@example.com',
			}

			const mockResponse = {
				success: false,
				error: 'validation_error',
				message: 'A user already exists with this email',
				status: 400,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.signup(signupData)

			expect(result).toEqual({
				success: false,
				error: 'validation_error',
				message: 'A user already exists with this email',
				status: 400,
			})
		})
	})

	describe('verify', () => {
		it('should make successful verify request', async () => {
			const verifyData = {
				code: '123456',
				type: 'onboarding' as const,
				target: 'test@example.com',
			}

			const mockResponse = {
				success: true,
				data: {
					verified: true,
					message: 'Verification successful',
				},
				status: 200,
			}

			mockHttpClient.postForm.mockResolvedValueOnce(mockResponse)

			const result = await authApi.verify(verifyData)

			expect(mockHttpClient.postForm).toHaveBeenCalledWith(
				'/api/auth/verify',
				verifyData,
			)
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle verify errors', async () => {
			const verifyData = {
				code: '000000',
				type: 'onboarding' as const,
				target: 'test@example.com',
			}

			const mockResponse = {
				success: false,
				error: 'invalid_code',
				message: 'Invalid verification code',
				status: 400,
			}

			mockHttpClient.postForm.mockResolvedValueOnce(mockResponse)

			const result = await authApi.verify(verifyData)

			expect(result).toEqual({
				success: false,
				error: 'invalid_code',
				message: 'Invalid verification code',
				status: 400,
			})
		})
	})

	describe('onboarding', () => {
		it('should make successful onboarding request', async () => {
			const onboardingData = {
				username: 'newuser',
				name: 'New User',
				password: 'password123',
				confirmPassword: 'password123',
				agreeToTermsOfServiceAndPrivacyPolicy: true,
				remember: true,
			}

			const mockResponse = {
				success: true,
				data: {
					user: {
						id: '1',
						email: 'test@example.com',
						username: 'newuser',
						name: 'New User',
					},
					session: {
						id: 'session-1',
						expirationDate: '2024-12-31T23:59:59Z',
					},
				},
				status: 200,
			}

			mockHttpClient.postForm.mockResolvedValueOnce(mockResponse)

			const result = await authApi.onboarding(onboardingData)

			expect(mockHttpClient.postForm).toHaveBeenCalledWith(
				'/api/auth/onboarding',
				onboardingData,
			)
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle onboarding validation errors', async () => {
			const onboardingData = {
				username: 'existinguser',
				name: 'New User',
				password: 'password123',
				confirmPassword: 'password123',
				agreeToTermsOfServiceAndPrivacyPolicy: true,
			}

			const mockResponse = {
				success: false,
				error: 'validation_failed',
				message: 'Username already exists',
				status: 400,
			}

			mockHttpClient.postForm.mockResolvedValueOnce(mockResponse)

			const result = await authApi.onboarding(onboardingData)

			expect(result).toEqual({
				success: false,
				error: 'validation_failed',
				message: 'Username already exists',
				status: 400,
			})
		})
	})

	describe('socialAuth', () => {
		it('should initiate social authentication', async () => {
			const provider = 'github'
			const redirectTo = '/dashboard'

			const mockResponse = {
				success: true,
				data: {
					authUrl: 'https://github.com/login/oauth/authorize?client_id=...',
					state: 'random-state-string',
				},
				status: 200,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.socialAuth(provider, redirectTo)

			expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/github', {
				provider,
				redirectTo,
			})
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle social auth errors', async () => {
			const provider = 'github'

			const mockResponse = {
				success: false,
				error: 'provider_error',
				message: 'OAuth provider is temporarily unavailable',
				status: 503,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.socialAuth(provider)

			expect(result).toEqual({
				success: false,
				error: 'provider_error',
				message: 'OAuth provider is temporarily unavailable',
				status: 503,
			})
		})
	})

	describe('socialCallback', () => {
		it('should handle OAuth callback successfully', async () => {
			const provider = 'github'
			const code = 'oauth-code-123'
			const state = 'state-string'

			const mockResponse = {
				success: true,
				data: {
					user: {
						id: '1',
						email: 'user@example.com',
						username: 'githubuser',
						name: 'GitHub User',
					},
					session: {
						id: 'session-1',
						expirationDate: '2024-12-31T23:59:59Z',
					},
				},
				status: 200,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.socialCallback(provider, code, state)

			expect(mockHttpClient.post).toHaveBeenCalledWith(
				'/auth/github/callback',
				{
					code,
					state,
					provider,
				},
			)
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle OAuth callback errors', async () => {
			const provider = 'github'
			const code = 'invalid-code'

			const mockResponse = {
				success: false,
				error: 'oauth_error',
				message: 'Invalid authorization code',
				status: 400,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.socialCallback(provider, code)

			expect(result).toEqual({
				success: false,
				error: 'oauth_error',
				message: 'Invalid authorization code',
				status: 400,
			})
		})
	})

	describe('refreshSession', () => {
		it('should refresh session successfully', async () => {
			const mockResponse = {
				success: true,
				data: {
					session: {
						id: 'new-session-id',
						expirationDate: '2024-12-31T23:59:59Z',
					},
				},
				status: 200,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.refreshSession()

			expect(mockHttpClient.post).toHaveBeenCalledWith('/auth/refresh')
			expect(result).toEqual({
				success: true,
				data: mockResponse.data,
				status: 200,
			})
		})

		it('should handle refresh errors', async () => {
			const mockResponse = {
				success: false,
				error: 'invalid_session',
				message: 'Session has expired',
				status: 401,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.refreshSession()

			expect(result).toEqual({
				success: false,
				error: 'invalid_session',
				message: 'Session has expired',
				status: 401,
			})
		})
	})

	describe('logout', () => {
		it('should logout successfully', async () => {
			const mockResponse = {
				success: true,
				data: {},
				status: 200,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.logout()

			expect(mockHttpClient.post).toHaveBeenCalledWith('/logout')
			expect(result).toEqual({
				success: true,
				data: {},
				status: 200,
			})
		})

		it('should handle logout errors', async () => {
			const mockResponse = {
				success: false,
				error: 'server_error',
				message: 'Failed to logout',
				status: 500,
			}

			mockHttpClient.post.mockResolvedValueOnce(mockResponse)

			const result = await authApi.logout()

			expect(result).toEqual({
				success: false,
				error: 'server_error',
				message: 'Failed to logout',
				status: 500,
			})
		})
	})

	describe('token management', () => {
		it('should set auth token', () => {
			const token = 'bearer-token-123'
			authApi.setAuthToken(token)

			expect(mockHttpClient.setDefaultHeader).toHaveBeenCalledWith(
				'Authorization',
				`Bearer ${token}`,
			)
		})

		it('should clear auth token', () => {
			authApi.clearAuthToken()

			expect(mockHttpClient.removeDefaultHeader).toHaveBeenCalledWith(
				'Authorization',
			)
		})
	})

	describe('configuration management', () => {
		it('should update base URL', () => {
			const newBaseUrl = 'https://new-api.example.com'
			authApi.updateBaseUrl(newBaseUrl)

			// Should create a new HttpClient instance
			expect(MockedHttpClient).toHaveBeenCalledTimes(2) // Initial + update
		})

		it('should get current configuration', () => {
			const config = authApi.getConfig()
			expect(config).toEqual({
				baseUrl: 'https://api.example.com',
				timeout: 10000,
				retryAttempts: 3,
			})
		})
	})
})

describe('OAuth Provider Utilities', () => {
	describe('isSupportedOAuthProvider', () => {
		it('should return true for supported providers', () => {
			expect(isSupportedOAuthProvider('github')).toBe(true)
			expect(isSupportedOAuthProvider('google')).toBe(true)
		})

		it('should return false for unsupported providers', () => {
			expect(isSupportedOAuthProvider('facebook')).toBe(false)
			expect(isSupportedOAuthProvider('twitter')).toBe(false)
			expect(isSupportedOAuthProvider('')).toBe(false)
		})
	})

	describe('getOAuthProviderConfig', () => {
		it('should return config for supported providers', () => {
			const githubConfig = getOAuthProviderConfig('github')
			expect(githubConfig).toEqual({
				name: 'github',
				displayName: 'GitHub',
				iconName: 'github',
				authUrl: '/auth/github',
				callbackUrl: '/auth/github/callback',
			})

			const googleConfig = getOAuthProviderConfig('google')
			expect(googleConfig).toEqual({
				name: 'google',
				displayName: 'Google',
				iconName: 'google',
				authUrl: '/auth/google',
				callbackUrl: '/auth/google/callback',
			})
		})

		it('should return null for unsupported providers', () => {
			expect(getOAuthProviderConfig('facebook')).toBeNull()
			expect(getOAuthProviderConfig('invalid')).toBeNull()
		})
	})

	describe('SUPPORTED_OAUTH_PROVIDERS', () => {
		it('should contain expected providers', () => {
			expect(SUPPORTED_OAUTH_PROVIDERS).toEqual(['github', 'google'])
		})
	})
})
