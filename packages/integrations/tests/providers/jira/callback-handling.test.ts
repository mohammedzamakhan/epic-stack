import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JiraProvider } from '../../../src/providers/jira/provider'
import { fixtures } from '../../utils/fixtures'
import type { OAuthCallbackParams } from '../../../src/types'

// Mock the encryption module
vi.mock('../../../src/encryption', () => ({
  decryptToken: vi.fn().mockResolvedValue('decrypted-token'),
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
}))

describe('JiraProvider - Callback Handling', () => {
  let provider: JiraProvider
  
  beforeEach(() => {
    provider = new JiraProvider()
    process.env.JIRA_CLIENT_ID = 'test-client-id'
    process.env.JIRA_CLIENT_SECRET = 'test-client-secret'
    
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('handleCallback', () => {
    it('should successfully exchange authorization code for tokens', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      // Mock token exchange response
      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.oauthResponse),
        text: vi.fn().mockResolvedValue(''),
      }

      // Mock user info response
      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.currentUserResponse),
      }

      // Mock accessible resources response
      const mockResourcesResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.accessibleResourcesResponse),
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockTokenResponse) // Token exchange
        .mockResolvedValueOnce(mockUserResponse) // User info
        .mockResolvedValueOnce(mockResourcesResponse) // Accessible resources

      const tokenData = await provider.handleCallback(callbackParams)

      expect(tokenData).toEqual({
        accessToken: 'test-jira-access-token',
        refreshToken: 'test-jira-refresh-token',
        expiresAt: expect.any(Date),
        scope: 'read:jira-work write:jira-work',
        metadata: {
          user: fixtures.jira.currentUserResponse,
          resources: fixtures.jira.accessibleResourcesResponse,
        },
      })

      // Verify token exchange request
      expect(fetch).toHaveBeenCalledWith('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'test-auth-code',
          redirect_uri: 'https://example.com/callback',
        }),
      })
    })

    it('should handle OAuth error responses', async () => {
      const callbackParams: OAuthCallbackParams = {
        error: 'access_denied',
        errorDescription: 'User denied access',
        state: 'test-state'
      }

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Jira OAuth error: access_denied - User denied access'
      )
    })

    it('should handle missing authorization code', async () => {
      const callbackParams: OAuthCallbackParams = {
        state: 'test-state'
      }

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Authorization code is required'
      )
    })

    it('should handle invalid state', async () => {
      const callbackParams: OAuthCallbackParams = {
        code: 'test-code',
        state: 'invalid-state'
      }

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow()
    })

    it('should handle missing redirect URI in state', async () => {
      // Create a malformed state manually (this would be very difficult to create in practice)
      const malformedStateData = {
        organizationId: 'org-123',
        providerName: 'jira',
        timestamp: Date.now(),
        nonce: 'test-nonce'
        // Missing redirectUrl
      }
      const statePayload = Buffer.from(JSON.stringify(malformedStateData)).toString('base64')
      const signature = 'fake-signature'
      const malformedState = `${statePayload}.${signature}`

      const callbackParams: OAuthCallbackParams = {
        code: 'test-code',
        state: malformedState
      }

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow()
    })

    it('should handle token exchange failure', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockErrorResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('Token exchange failed'),
      }

      global.fetch = vi.fn().mockResolvedValue(mockErrorResponse)

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Token exchange failed: Token exchange failed'
      )
    })

    it('should handle token response with error', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      global.fetch = vi.fn().mockResolvedValue(mockTokenResponse)

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Token exchange error: Invalid authorization code'
      )
    })

    it('should handle missing access token in response', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          // Missing access_token
          refresh_token: 'test-refresh-token',
          expires_in: 3600
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      global.fetch = vi.fn().mockResolvedValue(mockTokenResponse)

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'No access token received from Jira'
      )
    })

    it('should handle user info fetch failure', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.oauthResponse),
        text: vi.fn().mockResolvedValue(''),
      }

      const mockUserErrorResponse = {
        ok: false,
        statusText: 'Unauthorized',
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockTokenResponse) // Token exchange
        .mockResolvedValueOnce(mockUserErrorResponse) // User info failure
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) }) // Resources (won't be reached but needed for parallel call)

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Failed to get user info: Unauthorized'
      )
    })

    it('should handle accessible resources fetch failure', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.oauthResponse),
        text: vi.fn().mockResolvedValue(''),
      }

      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.currentUserResponse),
      }

      const mockResourcesErrorResponse = {
        ok: false,
        statusText: 'Forbidden',
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockTokenResponse) // Token exchange
        .mockResolvedValueOnce(mockUserResponse) // User info
        .mockResolvedValueOnce(mockResourcesErrorResponse) // Resources failure

      await expect(provider.handleCallback(callbackParams)).rejects.toThrow(
        'Failed to get accessible resources: Forbidden'
      )
    })

    it('should calculate correct expiration time', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...fixtures.jira.oauthResponse,
          expires_in: 7200 // 2 hours
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.currentUserResponse),
      }

      const mockResourcesResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.accessibleResourcesResponse),
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockUserResponse)
        .mockResolvedValueOnce(mockResourcesResponse)

      const beforeTime = Date.now()
      const tokenData = await provider.handleCallback(callbackParams)
      const afterTime = Date.now()

      expect(tokenData.expiresAt).toBeInstanceOf(Date)
      const expiresAtTime = tokenData.expiresAt!.getTime()
      
      // Should be approximately 2 hours from now (7200 seconds)
      expect(expiresAtTime).toBeGreaterThan(beforeTime + 7190000) // 7190 seconds
      expect(expiresAtTime).toBeLessThan(afterTime + 7210000) // 7210 seconds
    })

    it('should handle response without expires_in', async () => {
      // Generate a proper state using the provider
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')!

      const callbackParams: OAuthCallbackParams = {
        code: 'test-auth-code',
        state
      }

      const mockTokenResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          scope: 'read:jira-work write:jira-work'
          // No expires_in
        }),
        text: vi.fn().mockResolvedValue(''),
      }

      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.currentUserResponse),
      }

      const mockResourcesResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(fixtures.jira.accessibleResourcesResponse),
      }

      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockTokenResponse)
        .mockResolvedValueOnce(mockUserResponse)
        .mockResolvedValueOnce(mockResourcesResponse)

      const tokenData = await provider.handleCallback(callbackParams)

      expect(tokenData.expiresAt).toBeUndefined()
    })
  })
})