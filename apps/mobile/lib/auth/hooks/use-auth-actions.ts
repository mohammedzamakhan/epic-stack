import { useAuth } from './use-auth'
import type { LoginCredentials } from '../types'

/**
 * Hook for accessing authentication actions
 * Provides a clean interface for authentication operations
 */
export function useAuthActions() {
  const { login, signup, socialLogin, logout, refreshTokens, clearError } = useAuth()
  
  return {
    login,
    signup,
    socialLogin,
    logout,
    refreshTokens,
    clearError,
  }
}

/**
 * Hook for accessing authentication state (read-only)
 * Useful when you only need to read auth state without actions
 */
export function useAuthState() {
  const { user, tokens, isLoading, error, isAuthenticated } = useAuth()
  
  return {
    user,
    tokens,
    isLoading,
    error,
    isAuthenticated,
  }
}

/**
 * Hook for handling login with common patterns
 * Provides additional utilities for login flow
 */
export function useLogin() {
  const { login, isLoading, error, clearError } = useAuth()
  
  const handleLogin = async (credentials: LoginCredentials) => {
    // Clear any previous errors
    if (error) {
      clearError()
    }
    
    try {
      await login(credentials)
      // If we get here, login was successful
    } catch (err) {
      // Error is handled by the AuthProvider, but we need to re-throw
      // so the calling component knows the login failed
      console.error('Login failed:', err)
      throw err
    }
  }
  
  return {
    login: handleLogin,
    isLoading,
    error,
    clearError,
  }
}

/**
 * Hook for handling signup with common patterns
 * Provides additional utilities for signup flow
 */
export function useSignup() {
  const { signup, isLoading, error, clearError } = useAuth()
  
  const handleSignup = async (email: string) => {
    // Clear any previous errors
    if (error) {
      clearError()
    }
    
    try {
      await signup(email)
    } catch (err) {
      // Error is handled by the AuthProvider
      console.error('Signup failed:', err)
    }
  }
  
  return {
    signup: handleSignup,
    isLoading,
    error,
    clearError,
  }
}

/**
 * Hook for handling social login with common patterns
 * Provides additional utilities for social authentication flow
 */
export function useSocialLogin() {
  const { socialLogin, isLoading, error, clearError } = useAuth()
  
  const handleSocialLogin = async (provider: string) => {
    // Clear any previous errors
    if (error) {
      clearError()
    }
    
    try {
      await socialLogin(provider)
    } catch (err) {
      // Error is handled by the AuthProvider
      console.error('Social login failed:', err)
    }
  }
  
  return {
    socialLogin: handleSocialLogin,
    isLoading,
    error,
    clearError,
  }
}

/**
 * Hook for handling email verification
 * Provides utilities for verification flow
 */
export function useVerify() {
  const { verify, isLoading, error, clearError } = useAuth()
  
  const handleVerify = async (data: { code: string; type: string; target: string; redirectTo?: string }) => {
    // Clear any previous errors
    if (error) {
      clearError()
    }
    
    try {
      await verify(data)
    } catch (err) {
      // Error is handled by the AuthProvider
      console.error('Verification failed:', err)
      throw err
    }
  }
  
  return {
    verify: handleVerify,
    isLoading,
    error,
    clearError,
  }
}

/**
 * Hook for handling onboarding/account creation
 * Provides utilities for onboarding flow
 */
export function useOnboarding() {
  const { onboarding, isLoading, error, clearError } = useAuth()
  
  const handleOnboarding = async (data: { 
    email?: string;
    username: string; 
    name: string; 
    password: string; 
    confirmPassword: string; 
    agreeToTermsOfServiceAndPrivacyPolicy: boolean; 
    remember?: boolean; 
    redirectTo?: string 
  }) => {
    // Clear any previous errors
    if (error) {
      clearError()
    }
    
    try {
      await onboarding(data)
    } catch (err) {
      // Error is handled by the AuthProvider
      console.error('Onboarding failed:', err)
      throw err
    }
  }
  
  return {
    onboarding: handleOnboarding,
    isLoading,
    error,
    clearError,
  }
}