import React, {
	createContext,
	useReducer,
	useCallback,
	useEffect,
	type ReactNode,
} from 'react'
import type { AuthContextType, LoginCredentials } from './types'
import { authReducer, initialAuthState } from './auth-reducer'
import { TokenManager } from '../storage/session-manager'
import { jwtAuthApi } from '../api'

// Create the authentication context
export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
	children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [state, dispatch] = useReducer(authReducer, initialAuthState)

	// Initialize token manager
	const tokenManager = TokenManager.getInstance()

	// Initialize authentication state from stored tokens
	useEffect(() => {
		const initializeAuth = async () => {
			try {
				dispatch({ type: 'SET_LOADING', payload: { isLoading: true } })

				const storedTokens = await tokenManager.getCurrentTokens()
				const storedUser = await tokenManager.getUser()

				if (storedTokens && storedUser) {
					// Check if tokens are still valid
					const validation = await tokenManager.validateTokens()

					if (validation.isValid) {
						// Set auth token for API requests
						await jwtAuthApi.setAuthToken(storedTokens.accessToken)

						dispatch({
							type: 'AUTH_SUCCESS',
							payload: {
								user: storedUser,
								tokens: storedTokens,
							},
						})
					} else if (validation.needsRefresh) {
						// Try to refresh tokens
						try {
							await refreshTokens()
						} catch {
							// Refresh failed, clear storage
							await tokenManager.clearTokens()
							jwtAuthApi.clearAuthToken()
						}
					} else {
						// Tokens expired, clear storage
						await tokenManager.clearTokens()
						jwtAuthApi.clearAuthToken()
					}
				}
			} catch {
				console.error('Failed to initialize auth')
				dispatch({
					type: 'AUTH_ERROR',
					payload: { error: 'Failed to initialize authentication' },
				})
			} finally {
				dispatch({ type: 'SET_LOADING', payload: { isLoading: false } })
			}
		}

		void initializeAuth()
	}, [])

	// Login function
	const login = useCallback(async (credentials: LoginCredentials) => {
		try {
			console.log('🔐 Auth Context: Starting login process')
			dispatch({ type: 'AUTH_START' })

			const response = await jwtAuthApi.login(credentials)
			console.log('📡 Auth Context: API response:', {
				success: response.success,
				error: response.error,
				message: response.message,
			})
			console.log('📡 Auth Context: Full response:', response)
			console.log('📡 Auth Context: Response data:', response.data)

			if (
				response.success &&
				response?.data?.user &&
				response.data?.accessToken
			) {
				console.log(
					'✅ Auth Context: Login successful, setting user and tokens',
				)

				// Transform API response to match mobile app types
				const user = {
					id: response.data.user.id,
					email: response.data.user.email,
					username: response.data.user.username,
					name: response.data.user.name || undefined,
					image: response.data.user.image || undefined,
					createdAt: response.data.user.createdAt,
					updatedAt: response.data.user.updatedAt,
				}

				const tokens = {
					accessToken: response.data.accessToken,
					refreshToken: response.data.refreshToken,
					expiresIn: response.data.expiresIn,
					expiresAt: response.data.expiresAt,
				}

				// Store tokens and user data securely
				await tokenManager.storeTokens(tokens)
				await tokenManager.storeUser(user)

				// Set auth token for API requests
				await jwtAuthApi.setAuthToken(tokens.accessToken)

				dispatch({
					type: 'AUTH_SUCCESS',
					payload: { user, tokens },
				})
			} else {
				console.log(
					'❌ Auth Context: Login failed:',
					response.error || response.message,
				)
				const errorMessage =
					response.error || response.message || 'Login failed'

				dispatch({
					type: 'AUTH_ERROR',
					payload: { error: errorMessage },
				})

				// Throw error so calling components know login failed
				throw new Error(errorMessage)
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Login failed'
			console.log('❌ Auth Context: Login error:', errorMessage)

			dispatch({
				type: 'AUTH_ERROR',
				payload: { error: errorMessage },
			})

			// Re-throw the error so calling components know login failed
			throw error
		}
	}, [])

	// Signup function
	const signup = useCallback(async (email: string) => {
		try {
			dispatch({ type: 'AUTH_START' })

			const response = await jwtAuthApi.signup({ email })

			if (response.success) {
				// Signup successful - user needs to verify email
				dispatch({ type: 'SET_LOADING', payload: { isLoading: false } })
			} else {
				dispatch({
					type: 'AUTH_ERROR',
					payload: {
						error: response.error || response.message || 'Signup failed',
					},
				})
			}
		} catch (error) {
			dispatch({
				type: 'AUTH_ERROR',
				payload: {
					error: error instanceof Error ? error.message : 'Signup failed',
				},
			})
		}
	}, [])

	// Social login function
	const socialLogin = useCallback(
		async (
			provider: string,
			code?: string,
			state?: string,
			_redirectTo?: string,
		) => {
			try {
				dispatch({ type: 'AUTH_START' })

				if (code) {
					// Handle OAuth callback with authorization code
					const response = await jwtAuthApi.socialCallback(
						provider,
						code,
						state,
					)

					if (
						response.success &&
						response.data?.user &&
						response.data?.accessToken
					) {
						// Transform API response to match mobile app types
						const user = {
							id: response.data.user.id,
							email: response.data.user.email,
							username: response.data.user.username,
							name: response.data.user.name || undefined,
							image: response.data.user.image || undefined,
							createdAt: response.data.user.createdAt,
							updatedAt: response.data.user.updatedAt,
						}

						const tokens = {
							accessToken: response.data.accessToken,
							refreshToken: response.data.refreshToken,
							expiresIn: response.data.expiresIn,
							expiresAt: response.data.expiresAt,
						}

						// Store tokens and user data securely
						await tokenManager.storeTokens(tokens)
						await tokenManager.storeUser(user)

						// Set auth token for API requests
						await jwtAuthApi.setAuthToken(tokens.accessToken)

						dispatch({
							type: 'AUTH_SUCCESS',
							payload: { user, tokens },
						})
					} else {
						dispatch({
							type: 'AUTH_ERROR',
							payload: {
								error:
									response.error ||
									response.message ||
									'OAuth authentication failed',
							},
						})
					}
				} else {
					// This should not happen when called from OAuth hook
					// The OAuth hook handles the authorization flow and passes the code
					dispatch({
						type: 'AUTH_ERROR',
						payload: { error: 'OAuth authorization code is required' },
					})
				}
			} catch (error) {
				dispatch({
					type: 'AUTH_ERROR',
					payload: {
						error:
							error instanceof Error ? error.message : 'Social login failed',
					},
				})
			}
		},
		[],
	)

	// Logout function
	const logout = useCallback(async () => {
		try {
			const tokens = await tokenManager.getCurrentTokens()

			// Call logout API with refresh token
			if (tokens?.refreshToken) {
				await jwtAuthApi.logout(tokens.refreshToken)
			}

			// Clear stored tokens
			await tokenManager.clearTokens()

			// Clear auth token
			jwtAuthApi.clearAuthToken()

			// Update state
			dispatch({ type: 'LOGOUT' })
		} catch (error) {
			console.error('Logout error:', error)
			// Even if API call fails, clear local tokens
			await tokenManager.clearTokens()
			jwtAuthApi.clearAuthToken()
			dispatch({ type: 'LOGOUT' })
		}
	}, [])

	// Refresh tokens function
	const refreshTokens = useCallback(async () => {
		try {
			dispatch({ type: 'REFRESH_START' })

			const currentTokens = await tokenManager.getCurrentTokens()
			const user = await tokenManager.getUser()

			if (!currentTokens?.refreshToken || !user?.id) {
				await logout()
				return
			}

			const response = await jwtAuthApi.refreshTokens(
				currentTokens.refreshToken,
				user.id,
			)

			if (response.success && response.data?.accessToken) {
				// Transform API response to match mobile app types
				const tokens = {
					accessToken: response.data.accessToken,
					refreshToken: response.data.refreshToken,
					expiresIn: response.data.expiresIn,
					expiresAt: response.data.expiresAt,
				}

				// Store updated tokens
				await tokenManager.storeTokens(tokens)

				// Update auth token
				await jwtAuthApi.setAuthToken(tokens.accessToken)

				// Use existing user if not returned in refresh response
				const refreshedUser = response.data.user
					? {
							id: response.data.user.id,
							email: response.data.user.email,
							username: response.data.user.username,
							name: response.data.user.name || undefined,
							image: response.data.user.image || undefined,
							createdAt: response.data.user.createdAt,
							updatedAt: response.data.user.updatedAt,
						}
					: user

				dispatch({
					type: 'REFRESH_SUCCESS',
					payload: { user: refreshedUser, tokens },
				})
			} else {
				// Refresh failed, logout user
				await logout()
			}
		} catch (error) {
			console.error('Token refresh error:', error)
			dispatch({
				type: 'REFRESH_ERROR',
				payload: {
					error:
						error instanceof Error ? error.message : 'Token refresh failed',
				},
			})
			// On refresh error, logout user
			await logout()
		}
	}, [logout])

	// Verify function
	const verify = useCallback(
		async (data: {
			code: string
			type: string
			target: string
			redirectTo?: string
		}) => {
			try {
				dispatch({ type: 'AUTH_START' })

				const response = await jwtAuthApi.verify({
					code: data.code,
					type: data.type as 'onboarding',
					target: data.target,
					redirectTo: data.redirectTo,
				})

				if (response.success) {
					// Verification successful - user can proceed to onboarding
					dispatch({ type: 'SET_LOADING', payload: { isLoading: false } })
				} else {
					dispatch({
						type: 'AUTH_ERROR',
						payload: {
							error:
								response.error || response.message || 'Verification failed',
						},
					})
				}
			} catch (error) {
				dispatch({
					type: 'AUTH_ERROR',
					payload: {
						error:
							error instanceof Error ? error.message : 'Verification failed',
					},
				})
			}
		},
		[],
	)

	// Onboarding function
	const onboarding = useCallback(
		async (data: {
			email?: string
			username: string
			name: string
			password: string
			confirmPassword: string
			agreeToTermsOfServiceAndPrivacyPolicy: boolean
			remember?: boolean
			redirectTo?: string
		}) => {
			try {
				dispatch({ type: 'AUTH_START' })

				const response = await jwtAuthApi.onboarding(data)

				if (
					response.success &&
					response.data?.user &&
					response.data?.accessToken
				) {
					// Transform API response to match mobile app types
					const user = {
						id: response.data.user.id,
						email: response.data.user.email,
						username: response.data.user.username,
						name: response.data.user.name || undefined,
						image: response.data.user.image || undefined,
						createdAt: response.data.user.createdAt,
						updatedAt: response.data.user.updatedAt,
					}

					const tokens = {
						accessToken: response.data.accessToken,
						refreshToken: response.data.refreshToken,
						expiresIn: response.data.expiresIn,
						expiresAt: response.data.expiresAt,
					}

					// Store tokens and user data securely
					await tokenManager.storeTokens(tokens)
					await tokenManager.storeUser(user)

					// Set auth token for API requests
					await jwtAuthApi.setAuthToken(tokens.accessToken)

					dispatch({
						type: 'AUTH_SUCCESS',
						payload: { user, tokens },
					})
				} else {
					dispatch({
						type: 'AUTH_ERROR',
						payload: {
							error:
								response.error || response.message || 'Account creation failed',
						},
					})
				}
			} catch (error) {
				dispatch({
					type: 'AUTH_ERROR',
					payload: {
						error:
							error instanceof Error
								? error.message
								: 'Account creation failed',
					},
				})
			}
		},
		[],
	)

	// Clear error function
	const clearError = useCallback(() => {
		dispatch({ type: 'CLEAR_ERROR' })
	}, [])

	// Context value
	const contextValue: AuthContextType = {
		// State
		user: state.user,
		tokens: state.tokens,
		isLoading: state.isLoading,
		error: state.error,
		isAuthenticated: state.isAuthenticated,

		// Actions
		login,
		signup,
		verify,
		onboarding,
		socialLogin,
		logout,
		refreshTokens,
		clearError,
	}

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	)
}
