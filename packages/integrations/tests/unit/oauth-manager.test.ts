/**
 * Unit tests for OAuth manager components
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  OAuthStateManager,
  OAuthCallbackHandler,
  TokenRefreshManager,
  OAuthFlowManager,
} from '../../src/oauth-manager'
import { providerRegistry } from '../../src/provider'
import type { OAuthCallbackParams, TokenData, IntegrationProvider } from '../../src/types'

// Mock environment variables
const mockEnv = {
  INTEGRATIONS_OAUTH_STATE_SECRET: 'test-secret-key-for-oauth-state-validation-12345',
}

// Mock provider for testing
const mockProvider: IntegrationProvider = {
  name: 'test-provider',
  type: 'communication',
  displayName: 'Test Provider',
  description: 'Test provider for unit tests',
  logoPath: '/test-logo.png',
  getAuthUrl: vi.fn(),
  handleCallback: vi.fn(),
  refreshToken: vi.fn(),
  getAvailableChannels: vi.fn(),
  postMessage: vi.fn(),
  validateConnection: vi.fn(),
  getConfigSchema: vi.fn(),
}

describe('OAuthStateManager', () => {
  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv('INTEGRATIONS_OAUTH_STATE_SECRET', mockEnv.INTEGRATIONS_OAUTH_STATE_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('generateState', () => {
    it('should generate a valid state string', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'
      
      const state = OAuthStateManager.generateState(organizationId, providerName)
      
      expect(state).toBeDefined()
      expect(typeof state).toBe('string')
      expect(state).toContain('.')
      
      // Should be able to parse the state back
      const parsedState = OAuthStateManager.validateState(state)
      expect(parsedState.organizationId).toBe(organizationId)
      expect(parsedState.providerName).toBe(providerName)
    })

    it('should include optional redirect URL and additional data', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'
      const redirectUrl = '/dashboard'
      const additionalData = { customField: 'value' }
      
      const state = OAuthStateManager.generateState(
        organizationId,
        providerName,
        redirectUrl,
        additionalData
      )
      
      const parsedState = OAuthStateManager.validateState(state)
      expect(parsedState.redirectUrl).toBe(redirectUrl)
      expect(parsedState.customField).toBe('value')
    })

    it('should generate unique states for each call', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'
      
      const state1 = OAuthStateManager.generateState(organizationId, providerName)
      const state2 = OAuthStateManager.generateState(organizationId, providerName)
      
      expect(state1).not.toBe(state2)
    })

    it('should throw error when secret is missing', () => {
      const originalSecret = process.env.INTEGRATIONS_OAUTH_STATE_SECRET
      delete process.env.INTEGRATIONS_OAUTH_STATE_SECRET
      
      expect(() => {
        OAuthStateManager.generateState('org-123', 'slack')
      }).toThrow('INTEGRATIONS_OAUTH_STATE_SECRET environment variable is required')
      
      // Restore the environment variable
      if (originalSecret) {
        process.env.INTEGRATIONS_OAUTH_STATE_SECRET = originalSecret
      }
    })
  })

  describe('validateState', () => {
    it('should validate a valid state', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'
      
      const state = OAuthStateManager.generateState(organizationId, providerName)
      const parsedState = OAuthStateManager.validateState(state)
      
      expect(parsedState.organizationId).toBe(organizationId)
      expect(parsedState.providerName).toBe(providerName)
      expect(parsedState.timestamp).toBeTypeOf('number')
      expect(parsedState.nonce).toBeTypeOf('string')
    })

    it('should throw error for empty state', () => {
      expect(() => {
        OAuthStateManager.validateState('')
      }).toThrow('Invalid state: empty or non-string')
    })

    it('should throw error for non-string state', () => {
      expect(() => {
        OAuthStateManager.validateState(null as any)
      }).toThrow('Invalid state: empty or non-string')
    })

    it('should throw error for malformed state', () => {
      expect(() => {
        OAuthStateManager.validateState('invalid-state-format')
      }).toThrow('Invalid state: malformed structure')
    })

    it('should throw error for tampered state', () => {
      const validState = OAuthStateManager.generateState('org-123', 'slack')
      const [payload] = validState.split('.')
      const tamperedState = `${payload}.tampered-signature`
      
      expect(() => {
        OAuthStateManager.validateState(tamperedState)
      }).toThrow('Invalid state: signature verification failed')
    })

    it('should throw error for expired state', () => {
      // Mock Date.now to create an expired state
      const originalNow = Date.now
      const pastTime = Date.now() - (31 * 60 * 1000) // 31 minutes ago
      
      vi.spyOn(Date, 'now').mockReturnValue(pastTime)
      const expiredState = OAuthStateManager.generateState('org-123', 'slack')
      
      Date.now = originalNow
      
      expect(() => {
        OAuthStateManager.validateState(expiredState)
      }).toThrow('Invalid state: expired')
    })

    it('should throw error for state with missing required fields', () => {
      // Create a state with missing fields by manually crafting it
      const invalidStateData = { timestamp: Date.now() }
      const payload = Buffer.from(JSON.stringify(invalidStateData)).toString('base64')
      const signature = 'fake-signature'
      const invalidState = `${payload}.${signature}`
      
      expect(() => {
        OAuthStateManager.validateState(invalidState)
      }).toThrow('Invalid state: signature verification failed')
    })
  })
})

describe('OAuthCallbackHandler', () => {
  beforeEach(() => {
    vi.stubEnv('INTEGRATIONS_OAUTH_STATE_SECRET', mockEnv.INTEGRATIONS_OAUTH_STATE_SECRET)
    providerRegistry.register(mockProvider)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    providerRegistry.unregister('test-provider')
  })

  describe('handleCallback', () => {
    it('should handle successful OAuth callback', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const state = OAuthStateManager.generateState(organizationId, providerName)
      
      const mockTokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }
      
      vi.mocked(mockProvider.handleCallback).mockResolvedValue(mockTokenData)
      
      const params: OAuthCallbackParams = {
        organizationId,
        code: 'auth-code',
        state,
      }
      
      const result = await OAuthCallbackHandler.handleCallback(providerName, params)
      
      expect(result.tokenData).toEqual(mockTokenData)
      expect(result.stateData.organizationId).toBe(organizationId)
      expect(result.stateData.providerName).toBe(providerName)
      expect(mockProvider.handleCallback).toHaveBeenCalledWith(params)
    })

    it('should throw error when OAuth error is present', async () => {
      const params: OAuthCallbackParams = {
        organizationId: 'org-123',
        code: 'auth-code',
        state: 'valid-state',
        error: 'access_denied',
        errorDescription: 'User denied access',
      }
      
      await expect(
        OAuthCallbackHandler.handleCallback('test-provider', params)
      ).rejects.toThrow('OAuth error: User denied access')
    })

    it('should throw error when code is missing', async () => {
      const organizationId = 'org-123'
      const state = OAuthStateManager.generateState(organizationId, 'test-provider')
      
      const params: OAuthCallbackParams = {
        organizationId,
        code: '',
        state,
      }
      
      await expect(
        OAuthCallbackHandler.handleCallback('test-provider', params)
      ).rejects.toThrow('Missing required OAuth parameters: code or state')
    })

    it('should throw error when state is missing', async () => {
      const params: OAuthCallbackParams = {
        organizationId: 'org-123',
        code: 'auth-code',
        state: '',
      }
      
      await expect(
        OAuthCallbackHandler.handleCallback('test-provider', params)
      ).rejects.toThrow('Missing required OAuth parameters: code or state')
    })

    it('should throw error when provider name mismatch', async () => {
      const organizationId = 'org-123'
      const state = OAuthStateManager.generateState(organizationId, 'different-provider')
      
      const params: OAuthCallbackParams = {
        organizationId,
        code: 'auth-code',
        state,
      }
      
      await expect(
        OAuthCallbackHandler.handleCallback('test-provider', params)
      ).rejects.toThrow('Provider name mismatch in OAuth state')
    })

    it('should throw error when organization ID mismatch', async () => {
      const organizationId = 'org-123'
      const state = OAuthStateManager.generateState(organizationId, 'test-provider')
      
      const params: OAuthCallbackParams = {
        organizationId: 'different-org',
        code: 'auth-code',
        state,
      }
      
      await expect(
        OAuthCallbackHandler.handleCallback('test-provider', params)
      ).rejects.toThrow('Organization ID mismatch in OAuth state')
    })
  })

  describe('generateAuthUrl', () => {
    it('should generate authorization URL', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const redirectUri = 'https://app.com/callback'
      const expectedUrl = 'https://provider.com/oauth/authorize'
      
      vi.mocked(mockProvider.getAuthUrl).mockResolvedValue(expectedUrl)
      
      const result = await OAuthCallbackHandler.generateAuthUrl(
        organizationId,
        providerName,
        redirectUri
      )
      
      expect(result).toBe(expectedUrl)
      expect(mockProvider.getAuthUrl).toHaveBeenCalledWith(
        organizationId,
        redirectUri,
        undefined
      )
    })

    it('should pass additional parameters to provider', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const redirectUri = 'https://app.com/callback'
      const additionalParams = { scope: 'read write' }
      const expectedUrl = 'https://provider.com/oauth/authorize'
      
      vi.mocked(mockProvider.getAuthUrl).mockResolvedValue(expectedUrl)
      
      await OAuthCallbackHandler.generateAuthUrl(
        organizationId,
        providerName,
        redirectUri,
        additionalParams
      )
      
      expect(mockProvider.getAuthUrl).toHaveBeenCalledWith(
        organizationId,
        redirectUri,
        additionalParams
      )
    })
  })
})

describe
('TokenRefreshManager', () => {
  beforeEach(() => {
    providerRegistry.register(mockProvider)
  })

  afterEach(() => {
    vi.clearAllMocks()
    providerRegistry.unregister('test-provider')
  })

  describe('refreshTokenWithRetry', () => {
    it('should refresh token successfully on first attempt', async () => {
      const refreshToken = 'refresh-token'
      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }
      
      vi.mocked(mockProvider.refreshToken).mockResolvedValue(newTokenData)
      
      const result = await TokenRefreshManager.refreshTokenWithRetry('test-provider', refreshToken)
      
      expect(result).toEqual(newTokenData)
      expect(mockProvider.refreshToken).toHaveBeenCalledWith(refreshToken)
      expect(mockProvider.refreshToken).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const refreshToken = 'refresh-token'
      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }
      
      vi.mocked(mockProvider.refreshToken)
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockResolvedValue(newTokenData)
      
      const result = await TokenRefreshManager.refreshTokenWithRetry('test-provider', refreshToken)
      
      expect(result).toEqual(newTokenData)
      expect(mockProvider.refreshToken).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const refreshToken = 'refresh-token'
      
      vi.mocked(mockProvider.refreshToken)
        .mockRejectedValue(new Error('network timeout'))
      
      await expect(
        TokenRefreshManager.refreshTokenWithRetry('test-provider', refreshToken)
      ).rejects.toThrow('Token refresh failed for test-provider after 3 attempts')
      
      expect(mockProvider.refreshToken).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const refreshToken = 'refresh-token'
      
      vi.mocked(mockProvider.refreshToken)
        .mockRejectedValue(new Error('invalid_grant'))
      
      await expect(
        TokenRefreshManager.refreshTokenWithRetry('test-provider', refreshToken)
      ).rejects.toThrow('Token refresh failed for test-provider after 1 attempts')
      
      expect(mockProvider.refreshToken).toHaveBeenCalledTimes(1)
    })

    it('should throw error when provider does not support refresh', async () => {
      const providerWithoutRefresh = {
        ...mockProvider,
        refreshToken: undefined,
      }
      
      providerRegistry.unregister('test-provider')
      providerRegistry.register(providerWithoutRefresh as any)
      
      await expect(
        TokenRefreshManager.refreshTokenWithRetry('test-provider', 'refresh-token')
      ).rejects.toThrow('Provider test-provider does not support token refresh')
    })

    it('should throw error when token data is invalid', async () => {
      const refreshToken = 'refresh-token'
      const invalidTokenData = {
        accessToken: '', // Invalid - empty access token
        refreshToken: 'new-refresh-token',
      }
      
      vi.mocked(mockProvider.refreshToken).mockResolvedValue(invalidTokenData as TokenData)
      
      await expect(
        TokenRefreshManager.refreshTokenWithRetry('test-provider', refreshToken)
      ).rejects.toThrow('Invalid token data: missing access token')
    })
  })

  describe('shouldRefreshToken', () => {
    it('should return false for token without expiry', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }
      
      const result = TokenRefreshManager.shouldRefreshToken(tokenData)
      
      expect(result).toBe(false)
    })

    it('should return true for token expiring within buffer time', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 4 * 60 * 1000), // 4 minutes from now
      }
      
      const result = TokenRefreshManager.shouldRefreshToken(tokenData)
      
      expect(result).toBe(true)
    })

    it('should return false for token with plenty of time left', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      }
      
      const result = TokenRefreshManager.shouldRefreshToken(tokenData)
      
      expect(result).toBe(false)
    })

    it('should return true for expired token', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      }
      
      const result = TokenRefreshManager.shouldRefreshToken(tokenData)
      
      expect(result).toBe(true)
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for token without expiry', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }
      
      const result = TokenRefreshManager.isTokenExpired(tokenData)
      
      expect(result).toBe(false)
    })

    it('should return false for valid token', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      }
      
      const result = TokenRefreshManager.isTokenExpired(tokenData)
      
      expect(result).toBe(false)
    })

    it('should return true for expired token', () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      }
      
      const result = TokenRefreshManager.isTokenExpired(tokenData)
      
      expect(result).toBe(true)
    })
  })
})

describe('OAuthFlowManager', () => {
  beforeEach(() => {
    vi.stubEnv('INTEGRATIONS_OAUTH_STATE_SECRET', mockEnv.INTEGRATIONS_OAUTH_STATE_SECRET)
    providerRegistry.register(mockProvider)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    providerRegistry.unregister('test-provider')
  })

  describe('startOAuthFlow', () => {
    it('should start OAuth flow successfully', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const redirectUri = 'https://app.com/callback'
      const expectedUrl = 'https://provider.com/oauth/authorize'
      
      vi.mocked(mockProvider.getAuthUrl).mockResolvedValue(expectedUrl)
      
      const result = await OAuthFlowManager.startOAuthFlow(
        organizationId,
        providerName,
        redirectUri
      )
      
      expect(result.authUrl).toBe(expectedUrl)
      expect(result.state).toBeDefined()
      expect(typeof result.state).toBe('string')
      
      // Verify state can be validated
      const parsedState = OAuthStateManager.validateState(result.state)
      expect(parsedState.organizationId).toBe(organizationId)
      expect(parsedState.providerName).toBe(providerName)
    })

    it('should include additional parameters in state and auth URL', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const redirectUri = 'https://app.com/callback'
      const additionalParams = { 
        redirectUrl: '/dashboard',
        customParam: 'value'
      }
      const expectedUrl = 'https://provider.com/oauth/authorize'
      
      vi.mocked(mockProvider.getAuthUrl).mockResolvedValue(expectedUrl)
      
      const result = await OAuthFlowManager.startOAuthFlow(
        organizationId,
        providerName,
        redirectUri,
        additionalParams
      )
      
      // Verify additional params are passed to provider
      expect(mockProvider.getAuthUrl).toHaveBeenCalledWith(
        organizationId,
        redirectUri,
        expect.objectContaining({
          ...additionalParams,
          state: expect.any(String)
        })
      )
      
      // Verify additional params are in state
      const parsedState = OAuthStateManager.validateState(result.state)
      expect(parsedState.redirectUrl).toBe('/dashboard')
      expect(parsedState.customParam).toBe('value')
    })
  })

  describe('completeOAuthFlow', () => {
    it('should complete OAuth flow successfully', async () => {
      const organizationId = 'org-123'
      const providerName = 'test-provider'
      const state = OAuthStateManager.generateState(organizationId, providerName)
      
      const mockTokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }
      
      vi.mocked(mockProvider.handleCallback).mockResolvedValue(mockTokenData)
      
      const params: OAuthCallbackParams = {
        organizationId,
        code: 'auth-code',
        state,
      }
      
      const result = await OAuthFlowManager.completeOAuthFlow(providerName, params)
      
      expect(result.tokenData).toEqual(mockTokenData)
      expect(result.stateData.organizationId).toBe(organizationId)
      expect(result.stateData.providerName).toBe(providerName)
    })
  })

  describe('ensureValidToken', () => {
    it('should return original token when refresh not needed', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      }
      
      const result = await OAuthFlowManager.ensureValidToken('test-provider', tokenData)
      
      expect(result).toBe(tokenData)
      expect(mockProvider.refreshToken).not.toHaveBeenCalled()
    })

    it('should refresh token when needed', async () => {
      const oldTokenData: TokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
      }
      
      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }
      
      vi.mocked(mockProvider.refreshToken).mockResolvedValue(newTokenData)
      
      const result = await OAuthFlowManager.ensureValidToken('test-provider', oldTokenData)
      
      expect(result).toEqual(newTokenData)
      expect(mockProvider.refreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('should throw error when refresh needed but no refresh token', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        // No refresh token
      }
      
      await expect(
        OAuthFlowManager.ensureValidToken('test-provider', tokenData)
      ).rejects.toThrow('Token needs refresh but no refresh token available')
    })
  })
})