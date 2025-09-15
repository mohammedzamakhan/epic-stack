import type { User, TokenData, LoginCredentials } from '../../types'

// Re-export for convenience
export type { LoginCredentials }

// Authentication action types
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: TokenData } }
  | { type: 'AUTH_ERROR'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; payload: { user: User; tokens: TokenData } }
  | { type: 'REFRESH_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }

// Authentication state interface
export interface AuthState {
  user: User | null
  tokens: TokenData | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

// Authentication context interface
export interface AuthContextType {
  // State
  user: User | null
  tokens: TokenData | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  signup: (email: string) => Promise<void>
  verify: (data: { code: string; type: string; target: string; redirectTo?: string }) => Promise<void>
  onboarding: (data: { 
    username: string; 
    name: string; 
    password: string; 
    confirmPassword: string; 
    agreeToTermsOfServiceAndPrivacyPolicy: boolean; 
    remember?: boolean; 
    redirectTo?: string 
  }) => Promise<void>
  socialLogin: (provider: string, code?: string, state?: string, redirectTo?: string) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  clearError: () => void
}