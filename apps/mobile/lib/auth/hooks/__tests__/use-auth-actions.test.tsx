import {
  useAuthActions,
  useAuthState,
  useLogin,
  useSignup,
  useSocialLogin,
} from '../use-auth-actions'
import { useAuth } from '../use-auth'

// Mock useAuth
jest.mock('../use-auth')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

describe('useAuthActions', () => {
  const mockContextValue = {
    user: null,
    tokens: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: jest.fn(),
    signup: jest.fn(),
    verify: jest.fn(),
    onboarding: jest.fn(),
    socialLogin: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    clearError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue(mockContextValue)
  })

  describe('useAuthActions', () => {
    it('should return authentication actions', () => {
      const result = useAuthActions()

      expect(result).toEqual({
        login: mockContextValue.login,
        signup: mockContextValue.signup,
        socialLogin: mockContextValue.socialLogin,
        logout: mockContextValue.logout,
        refreshTokens: mockContextValue.refreshTokens,
        clearError: mockContextValue.clearError,
      })
    })
  })

  describe('useAuthState', () => {
    it('should return authentication state', () => {
      const result = useAuthState()

      expect(result).toEqual({
        user: mockContextValue.user,
        tokens: mockContextValue.tokens,
        isLoading: mockContextValue.isLoading,
        error: mockContextValue.error,
        isAuthenticated: mockContextValue.isAuthenticated,
      })
    })
  })

  describe('useLogin', () => {
    it('should return login utilities', () => {
      const result = useLogin()

      expect(result).toEqual({
        login: expect.any(Function),
        isLoading: mockContextValue.isLoading,
        error: mockContextValue.error,
        clearError: mockContextValue.clearError,
      })
    })

    it('should clear error before login', async () => {
      const contextWithError = {
        ...mockContextValue,
        error: 'Previous error',
      }
      
      mockUseAuth.mockReturnValue(contextWithError)

      const { login } = useLogin()

      await login({
        username: 'test@example.com',
        password: 'password',
      })

      expect(contextWithError.clearError).toHaveBeenCalled()
      expect(contextWithError.login).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password',
      })
    })

    it('should handle login errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockContextValue.login.mockRejectedValue(new Error('Login failed'))

      const { login } = useLogin()

      await login({
        username: 'test@example.com',
        password: 'password',
      })

      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('useSignup', () => {
    it('should return signup utilities', () => {
      const result = useSignup()

      expect(result).toEqual({
        signup: expect.any(Function),
        isLoading: mockContextValue.isLoading,
        error: mockContextValue.error,
        clearError: mockContextValue.clearError,
      })
    })

    it('should clear error before signup', async () => {
      const contextWithError = {
        ...mockContextValue,
        error: 'Previous error',
      }
      
      mockUseAuth.mockReturnValue(contextWithError)

      const { signup } = useSignup()

      await signup('test@example.com')

      expect(contextWithError.clearError).toHaveBeenCalled()
      expect(contextWithError.signup).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle signup errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockContextValue.signup.mockRejectedValue(new Error('Signup failed'))

      const { signup } = useSignup()

      await signup('test@example.com')

      expect(consoleSpy).toHaveBeenCalledWith('Signup failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('useSocialLogin', () => {
    it('should return social login utilities', () => {
      const result = useSocialLogin()

      expect(result).toEqual({
        socialLogin: expect.any(Function),
        isLoading: mockContextValue.isLoading,
        error: mockContextValue.error,
        clearError: mockContextValue.clearError,
      })
    })

    it('should clear error before social login', async () => {
      const contextWithError = {
        ...mockContextValue,
        error: 'Previous error',
      }
      
      mockUseAuth.mockReturnValue(contextWithError)

      const { socialLogin } = useSocialLogin()

      await socialLogin('google')

      expect(contextWithError.clearError).toHaveBeenCalled()
      expect(contextWithError.socialLogin).toHaveBeenCalledWith('google')
    })

    it('should handle social login errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockContextValue.socialLogin.mockRejectedValue(new Error('Social login failed'))

      const { socialLogin } = useSocialLogin()

      await socialLogin('google')

      expect(consoleSpy).toHaveBeenCalledWith('Social login failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})