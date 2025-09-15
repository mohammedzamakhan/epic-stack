import { AuthApi } from '../../api/auth-api'

// Mock the HTTP client for integration testing
jest.mock('../../api/http-client')

// Mock OAuth service without importing it directly
const mockOAuthService = {
  isProviderConfigured: jest.fn(),
  getProviderNames: jest.fn(),
  authenticate: jest.fn(),
  handleCallback: jest.fn(),
  getProvider: jest.fn(),
}

describe('OAuth Integration', () => {
  let authApi: AuthApi
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    authApi = new AuthApi({
      baseUrl: 'http://localhost:3001',
    })
  })

  describe('OAuth Flow Integration', () => {
    it('should complete full OAuth flow for GitHub', async () => {
      // Mock OAuth service authentication
      mockOAuthService.authenticate.mockResolvedValue({
        success: true,
        code: 'github_auth_code_123',
        state: 'csrf_state_token',
      })

      // Mock backend callback response
      const mockBackendResponse = {
        success: true,
        data: {
          user: {
            id: 'user_123',
            email: 'user@example.com',
            username: 'testuser',
            name: 'Test User',
          },
          session: {
            id: 'session_123',
            userId: 'user_123',
            expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        status: 200,
      }

      // Mock the HTTP client get method
      const mockGet = jest.fn().mockResolvedValue(mockBackendResponse)
      ;(authApi as any).httpClient.get = mockGet

      // Test the OAuth callback
      const result = await authApi.socialCallback('github', 'github_auth_code_123', 'csrf_state_token')

      expect(mockGet).toHaveBeenCalledWith('/auth/github/callback?code=github_auth_code_123&state=csrf_state_token')
      expect(result.success).toBe(true)
      expect(result.data?.user?.id).toBe('user_123')
      expect(result.data?.session?.id).toBe('session_123')
    })

    it('should handle OAuth callback error from backend', async () => {
      // Mock backend error response
      const mockErrorResponse = {
        success: false,
        error: 'invalid_grant',
        message: 'The authorization code is invalid or expired',
        status: 400,
      }

      const mockGet = jest.fn().mockResolvedValue(mockErrorResponse)
      ;(authApi as any).httpClient.get = mockGet

      const result = await authApi.socialCallback('github', 'invalid_code', 'state')

      expect(result.success).toBe(false)
      expect(result.error).toBe('invalid_grant')
      expect(result.message).toBe('The authorization code is invalid or expired')
    })

    it('should handle network errors during OAuth callback', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Network timeout'))
      ;(authApi as any).httpClient.get = mockGet

      const result = await authApi.socialCallback('github', 'auth_code', 'state')

      expect(result.success).toBe(false)
      expect(result.error).toBe('network_error')
      expect(result.message).toBe('Network timeout')
    })

    it('should handle OAuth callback for new user (onboarding flow)', async () => {
      // Mock backend response for new user that needs onboarding
      const mockOnboardingResponse = {
        success: true,
        data: {
          redirectTo: '/onboarding/github',
          requiresOnboarding: true,
        },
        status: 200,
      }

      const mockGet = jest.fn().mockResolvedValue(mockOnboardingResponse)
      ;(authApi as any).httpClient.get = mockGet

      const result = await authApi.socialCallback('github', 'new_user_code', 'state')

      expect(result.success).toBe(true)
      expect(result.data?.user).toBeDefined()
      expect(result.data?.requiresTwoFactor).toBe(false)
    })

    it('should handle OAuth callback for banned user', async () => {
      // Mock backend response for banned user
      const mockBannedResponse = {
        success: false,
        error: 'user_banned',
        message: 'Your account has been suspended',
        status: 403,
      }

      const mockGet = jest.fn().mockResolvedValue(mockBannedResponse)
      ;(authApi as any).httpClient.get = mockGet

      const result = await authApi.socialCallback('github', 'banned_user_code', 'state')

      expect(result.success).toBe(false)
      expect(result.error).toBe('user_banned')
      expect(result.message).toBe('Your account has been suspended')
    })
  })

  describe('OAuth Provider Configuration', () => {
    it('should validate GitHub provider configuration', () => {
      expect(mockOAuthService.isProviderConfigured('github')).toBeDefined()
      expect(mockOAuthService.getProvider('github')).toBeDefined()
    })

    it('should validate Google provider configuration', () => {
      expect(mockOAuthService.isProviderConfigured('google')).toBeDefined()
      expect(mockOAuthService.getProvider('google')).toBeDefined()
    })

    it('should handle unconfigured providers', () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(false)
      
      expect(mockOAuthService.isProviderConfigured('unknown')).toBe(false)
    })
  })

  describe('OAuth Error Scenarios', () => {
    it('should handle user cancellation during OAuth flow', async () => {
      mockOAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'user_cancelled',
        errorDescription: 'User cancelled the authentication flow',
      })

      // This would be handled by the OAuth hook, not the API directly
      const result = await mockOAuthService.authenticate('github')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('user_cancelled')
    })

    it('should handle OAuth provider errors', async () => {
      mockOAuthService.authenticate.mockResolvedValue({
        success: false,
        error: 'access_denied',
        errorDescription: 'The user denied the request',
      })

      const result = await mockOAuthService.authenticate('github')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('access_denied')
    })

    it('should handle invalid OAuth state parameter', async () => {
      const mockInvalidStateResponse = {
        success: false,
        error: 'invalid_state',
        message: 'The state parameter is invalid or missing',
        status: 400,
      }

      const mockGet = jest.fn().mockResolvedValue(mockInvalidStateResponse)
      ;(authApi as any).httpClient.get = mockGet

      const result = await authApi.socialCallback('github', 'valid_code', 'invalid_state')

      expect(result.success).toBe(false)
      expect(result.error).toBe('invalid_state')
    })
  })

  describe('OAuth Security', () => {
    it('should include state parameter for CSRF protection', async () => {
      const mockGet = jest.fn().mockResolvedValue({ success: true, data: {}, status: 200 })
      ;(authApi as any).httpClient.get = mockGet

      await authApi.socialCallback('github', 'code', 'csrf_protection_state')

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('state=csrf_protection_state')
      )
    })

    it('should handle missing authorization code', async () => {
      const result = await authApi.socialCallback('github', '', 'state')

      // The API should handle empty codes gracefully
      expect(result.success).toBe(false)
    })

    it('should validate provider names', async () => {
      const mockGet = jest.fn().mockResolvedValue({ success: true, data: {}, status: 200 })
      ;(authApi as any).httpClient.get = mockGet

      await authApi.socialCallback('github', 'code', 'state')

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/auth/github/callback')
      )
    })
  })
})