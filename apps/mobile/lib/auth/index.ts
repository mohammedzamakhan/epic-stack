export { AuthProvider, AuthContext } from './auth-context'
export { authReducer, initialAuthState } from './auth-reducer'
export type { AuthAction, AuthState, AuthContextType } from './types'

// Export hooks
export {
  useAuth,
  useAuthActions,
  useAuthState,
  useLogin,
  useSignup,
  useSocialLogin,
  useAuthGuard,
  useGuestGuard,
  useConditionalAuthGuard,
  useRoleGuard,
} from './hooks'