import type { AuthAction, AuthState } from './types'

// Initial authentication state
export const initialAuthState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
}

// Authentication reducer
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      }

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        tokens: null,
        isLoading: false,
        error: action.payload.error,
        isAuthenticated: false,
      }

    case 'LOGOUT':
      return {
        ...initialAuthState,
      }

    case 'REFRESH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case 'REFRESH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      }

    case 'REFRESH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        // Don't clear authentication on refresh error - user might still be logged in
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      }

    default:
      return state
  }
}